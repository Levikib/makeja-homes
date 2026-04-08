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

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // No companyId filtering needed — each tenant schema is already isolated.
    const db = getPrismaForRequest(request);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total revenue this month (all payment types including deposits)
    const revenueRows = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM payments
      WHERE status::text IN ('COMPLETED', 'VERIFIED')
        AND "createdAt" >= $1
        AND "createdAt" <= $2
    `, startOfMonth, endOfMonth) as any[];
    const totalRevenue = Number(revenueRows[0]?.total || 0);

    // Deposits collected this month
    const depositRows = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
      FROM payments
      WHERE status::text IN ('COMPLETED', 'VERIFIED')
        AND "paymentType"::text = 'DEPOSIT'
        AND "createdAt" >= $1
        AND "createdAt" <= $2
    `, startOfMonth, endOfMonth) as any[];
    const depositsCollected = Number(depositRows[0]?.total || 0);

    // Pending verification (manual payments)
    const pendingRows = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
      FROM payments
      WHERE "verificationStatus"::text = 'PENDING'
        AND "paymentMethod"::text IN ('M_PESA', 'BANK_TRANSFER', 'CASH')
    `) as any[];

    // Overdue bills
    const overdueRows = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM("totalAmount"), 0) AS total, COUNT(*) AS count
      FROM monthly_bills
      WHERE status::text = 'OVERDUE'
        OR (status::text = 'PENDING' AND "dueDate" < $1)
    `, now) as any[];

    // Collection rate last 30 days
    const billedRows = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM("totalAmount"), 0) AS total
      FROM monthly_bills
      WHERE "dueDate" >= $1
        AND "dueDate" <= $2
    `, thirtyDaysAgo, now) as any[];

    const collectedRows = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM payments
      WHERE status::text IN ('COMPLETED', 'VERIFIED')
        AND "createdAt" >= $1
        AND "createdAt" <= $2
    `, thirtyDaysAgo, now) as any[];

    const totalBilled = Number(billedRows[0]?.total || 0);
    const totalCollected = Number(collectedRows[0]?.total || 0);
    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

    // Payment method breakdown this month
    const methodRows = await db.$queryRawUnsafe(`
      SELECT "paymentMethod"::text AS method, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
      FROM payments
      WHERE status::text IN ('COMPLETED', 'VERIFIED')
        AND "createdAt" >= $1
        AND "createdAt" <= $2
      GROUP BY "paymentMethod"::text
    `, startOfMonth, endOfMonth) as any[];

    const methodBreakdown: Record<string, { count: number; total: number }> = {};
    let topMethodCount = 0;
    let topPaymentMethod = "—";
    for (const row of methodRows) {
      const cnt = Number(row.count || 0);
      methodBreakdown[row.method] = { count: cnt, total: Number(row.total || 0) };
      if (cnt > topMethodCount) { topMethodCount = cnt; topPaymentMethod = row.method; }
    }

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
        methodBreakdown,
        topPaymentMethod,
      },
    });
  } catch (error: any) {
    console.error("Payment stats error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch payment stats" }, { status: 500 });
  }
}
