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

    const db = getPrismaForRequest(request);

    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT t.id, t."unitId", un."unitNumber", p.name AS "propertyName"
      FROM tenants t
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t."userId" = $1 LIMIT 1
    `, userId);

    if (!tenantRows.length) return NextResponse.json({ error: "Tenant record not found" }, { status: 404 });
    const tenant = tenantRows[0];

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const billRows = await db.$queryRawUnsafe<any[]>(`
      SELECT id, month, "rentAmount", "waterAmount", "garbageAmount", "totalAmount",
             status::text AS status, "dueDate", "paidDate"
      FROM monthly_bills
      WHERE "tenantId" = $1 AND month = $2
      LIMIT 1
    `, tenant.id, currentMonthStart);

    if (!billRows.length) return NextResponse.json({ error: "No bill found for current month" }, { status: 404 });
    const bill = billRows[0];

    return NextResponse.json({
      bill: {
        id: bill.id,
        month: bill.month,
        rentAmount: Number(bill.rentAmount),
        waterAmount: Number(bill.waterAmount),
        garbageAmount: Number(bill.garbageAmount),
        totalAmount: Number(bill.totalAmount),
        status: bill.status,
        dueDate: bill.dueDate,
        paidDate: bill.paidDate,
        isPaid: bill.status === "PAID",
      },
      tenant: { name: tenant.propertyName, unit: tenant.unitNumber },
    });
  } catch (error: any) {
    console.error("❌ Error fetching current bill:", error?.message);
    return NextResponse.json({ error: "Failed to fetch bill" }, { status: 500 });
  }
}
