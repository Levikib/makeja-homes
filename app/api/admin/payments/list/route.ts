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
    if (payload.role !== "ADMIN" && payload.role !== "MANAGER")
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page       = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit      = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const offset     = (page - 1) * limit;
    const status     = searchParams.get("status") || "all";
    const propertyId = searchParams.get("propertyId") || "all";
    const search     = searchParams.get("search") || "";

    const db = getPrismaForRequest(request);

    const validStatuses = ["PENDING","COMPLETED","FAILED","REFUNDED","REVERSED","VERIFIED","REJECTED"];

    let where = `WHERE 1=1`;
    const args: any[] = [];
    let idx = 1;

    if (status !== "all" && validStatuses.includes(status)) {
      where += ` AND p.status::text = $${idx++}`;
      args.push(status);
    }
    if (propertyId !== "all") {
      where += ` AND prop.id = $${idx++}`;
      args.push(propertyId);
    }
    if (search) {
      where += ` AND (
        u."firstName" ILIKE $${idx}
        OR u."lastName" ILIKE $${idx}
        OR u.email ILIKE $${idx}
        OR p."referenceNumber" ILIKE $${idx}
        OR un."unitNumber" ILIKE $${idx}
      )`;
      args.push(`%${search}%`);
      idx++;
    }

    const countRows = await db.$queryRawUnsafe<{ cnt: string }[]>(
      `SELECT COUNT(*)::text AS cnt
       FROM payments p
       JOIN tenants t ON t.id = p."tenantId"
       JOIN users u ON u.id = t."userId"
       JOIN units un ON un.id = t."unitId"
       JOIN properties prop ON prop.id = un."propertyId"
       ${where}`,
      ...args
    );
    const total = Number(countRows[0]?.cnt ?? 0);

    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT
         p.id,
         p."referenceNumber",
         p.amount,
         p."paymentMethod"::text AS "paymentMethod",
         p."paymentType"::text AS "paymentType",
         p.status::text AS status,
         p."verificationStatus"::text AS "verificationStatus",
         p."paymentDate",
         p."createdAt",
         p.notes,
         p."receiptUrl",
         p."transactionId",
         p."paystackReference",
         p."proofOfPaymentUrl",
         p."paymentComponents",
         u."firstName",
         u."lastName",
         u.email,
         un."unitNumber",
         prop.name AS "propertyName",
         prop.id AS "propertyId"
       FROM payments p
       JOIN tenants t ON t.id = p."tenantId"
       JOIN users u ON u.id = t."userId"
       JOIN units un ON un.id = t."unitId"
       JOIN properties prop ON prop.id = un."propertyId"
       ${where}
       ORDER BY p."createdAt" DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      ...args, limit, offset
    );

    const payments = rows.map(r => ({
      id: r.id,
      referenceNumber: r.referenceNumber,
      amount: Number(r.amount),
      paymentMethod: r.paymentMethod,
      paymentType: r.paymentType,
      status: r.status,
      verificationStatus: r.verificationStatus,
      paymentDate: r.paymentDate,
      createdAt: r.createdAt,
      notes: r.notes,
      receiptUrl: r.receiptUrl,
      transactionId: r.transactionId,
      paystackReference: r.paystackReference,
      proofOfPaymentUrl: r.proofOfPaymentUrl,
      paymentComponents: r.paymentComponents ?? [],
      tenant: { firstName: r.firstName, lastName: r.lastName, email: r.email },
      unit: { unitNumber: r.unitNumber },
      property: { name: r.propertyName, id: r.propertyId },
    }));

    return NextResponse.json({
      payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error("❌ Error fetching payments:", error?.message);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
