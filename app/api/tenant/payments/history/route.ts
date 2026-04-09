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
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "TENANT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const db = getPrismaForRequest(request);

    const tenantRows = await db.$queryRawUnsafe<any[]>(
      `SELECT t.id, t."unitId", un."unitNumber", p.name AS "propertyName", p.id AS "propertyId"
       FROM tenants t
       JOIN units un ON un.id = t."unitId"
       JOIN properties p ON p.id = un."propertyId"
       WHERE t."userId" = $1 LIMIT 1`,
      userId
    );
    if (!tenantRows.length) return NextResponse.json({ payments: [], totalPaid: 0 });

    const tenant = tenantRows[0];

    // All payments for this tenant
    const payments = await db.$queryRawUnsafe<any[]>(`
      SELECT
        p.id,
        p."referenceNumber",
        p.amount,
        p."paymentType"::text AS "paymentType",
        p."paymentMethod"::text AS "paymentMethod",
        p.status::text AS status,
        p."verificationStatus"::text AS "verificationStatus",
        p."paymentDate",
        p."createdAt",
        p.notes,
        p."receiptUrl",
        p."transactionId",
        p."paystackReference",
        mb.month AS "billMonth",
        mb."dueDate" AS "billDueDate"
      FROM payments p
      LEFT JOIN monthly_bills mb ON mb."paymentId" = p.id
      WHERE p."tenantId" = $1
      ORDER BY p."paymentDate" DESC NULLS LAST, p."createdAt" DESC
    `, tenant.id);

    const totalPaid = payments
      .filter(p => p.status === 'COMPLETED' || p.status === 'VERIFIED')
      .reduce((s, p) => s + Number(p.amount), 0);

    const formatted = payments.map(p => ({
      id: p.id,
      referenceNumber: p.referenceNumber,
      amount: Number(p.amount),
      paymentType: p.paymentType,
      paymentMethod: p.paymentMethod,
      status: p.status,
      verificationStatus: p.verificationStatus,
      paymentDate: p.paymentDate || p.createdAt,
      notes: p.notes,
      receiptUrl: p.receiptUrl,
      transactionId: p.transactionId,
      paystackReference: p.paystackReference,
      billMonth: p.billMonth,
      billDueDate: p.billDueDate,
      unitNumber: tenant.unitNumber,
      propertyName: tenant.propertyName,
    }));

    return NextResponse.json({ payments: formatted, totalPaid });
  } catch (error: any) {
    console.error("❌ Error fetching payment history:", error?.message);
    return NextResponse.json({ error: "Failed to fetch payment history" }, { status: 500 });
  }
}
