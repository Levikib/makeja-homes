import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;
    const companyId = payload.companyId as string | null;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = getPrismaForRequest(request);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Company filter: join via units → properties
    const companyJoin = companyId
      ? `JOIN units un ON un.id = p."unitId" JOIN properties pr ON pr.id = un."propertyId" AND pr."companyId" = '${companyId}'`
      : "";

    // Total revenue this month (all payment types including deposits)
    const revenueRows = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM(p.amount), 0) as total
      FROM payments p
      WHERE p.status::text IN ('COMPLETED', 'VERIFIED')
        AND p."createdAt" >= $1 AND p."createdAt" <= $2
        ${companyId ? `AND p."unitId" IN (SELECT id FROM units WHERE "propertyId" IN (SELECT id FROM properties WHERE "companyId" = '${companyId}'))` : ""}
    `, startOfMonth, endOfMonth) as any[];
    const totalRevenue = Number(revenueRows[0]?.total || 0);

    // Deposits collected this month
    const depositRows = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM payments
      WHERE status::text IN ('COMPLETED', 'VERIFIED')
        AND "paymentType"::text = 'DEPOSIT'
        AND "createdAt" >= $1 AND "createdAt" <= $2
        ${companyId ? `AND "unitId" IN (SELECT id FROM units WHERE "propertyId" IN (SELECT id FROM properties WHERE "companyId" = '${companyId}'))` : ""}
    `, startOfMonth, endOfMonth) as any[];
    const depositsCollected = Number(depositRows[0]?.total || 0);

    // Pending verification (manual payments)
    const pendingRows = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM payments
      WHERE "verificationStatus"::text = 'PENDING'
        AND "paymentMethod"::text IN ('M_PESA', 'BANK_TRANSFER', 'CASH')
        ${companyId ? `AND "unitId" IN (SELECT id FROM units WHERE "propertyId" IN (SELECT id FROM properties WHERE "companyId" = '${companyId}'))` : ""}
    `) as any[];

    // Overdue bills
    const overdueRows = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM("totalAmount"), 0) as total, COUNT(*) as count
      FROM monthly_bills
      WHERE status::text = 'OVERDUE'
        OR (status::text = 'PENDING' AND "dueDate" < $1)
    `, now) as any[];

    // Collection rate last 30 days
    const billedRows = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM("totalAmount"), 0) as total
      FROM monthly_bills WHERE "dueDate" >= $1 AND "dueDate" <= $2
    `, thirtyDaysAgo, now) as any[];

    const collectedRows = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE status::text IN ('COMPLETED', 'VERIFIED')
        AND "createdAt" >= $1 AND "createdAt" <= $2
        ${companyId ? `AND "unitId" IN (SELECT id FROM units WHERE "propertyId" IN (SELECT id FROM properties WHERE "companyId" = '${companyId}'))` : ""}
    `, thirtyDaysAgo, now) as any[];

    const totalBilled = Number(billedRows[0]?.total || 0);
    const totalCollected = Number(collectedRows[0]?.total || 0);
    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

    return NextResponse.json({
      stats: {
        totalRevenue,
        depositsCollected,
        pendingPayments: {
          count: Number(pendingRows[0]?.count || 0),
          amount: Number(pendingRows[0]?.total || 0),
        },
        overduePayments: {
          count: Number(overdueRows[0]?.count || 0),
          amount: Number(overdueRows[0]?.total || 0),
        },
        collectionRate,
      },
    });
  } catch (error: any) {
    console.error("Payment stats error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch payment stats" }, { status: 500 });
  }
}
