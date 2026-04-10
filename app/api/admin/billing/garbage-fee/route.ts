import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const body = await request.json();
    const { tenantId, amount, isApplicable } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    // Get tenant details
    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT id, "unitId", "rentAmount" FROM tenants WHERE id = $1 LIMIT 1
    `, tenantId);

    if (tenantRows.length === 0) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const tenant = tenantRows[0];

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const garbageAmount = isApplicable ? Number(amount) : 0;

    // Check if garbage fee already exists for this month
    const existingFee = await db.$queryRawUnsafe<any[]>(`
      SELECT id FROM garbage_fees
      WHERE "tenantId" = $1 AND month >= $2 AND month < $3
      LIMIT 1
    `, tenantId, currentMonthStart, nextMonthStart);

    if (existingFee.length > 0) {
      await db.$executeRawUnsafe(`
        UPDATE garbage_fees SET amount = $1, "isApplicable" = $2, "updatedAt" = $3
        WHERE id = $4
      `, garbageAmount, isApplicable, now, existingFee[0].id);
    } else {
      const feeId = `garbage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.$executeRawUnsafe(`
        INSERT INTO garbage_fees (id, "tenantId", "unitId", month, amount, "isApplicable", status, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, 'PENDING'::"GarbageFeeStatus", $7, $7)
      `, feeId, tenantId, tenant.unitId, currentMonthStart, garbageAmount, isApplicable, now);
    }

    // Update or create monthly bill
    const existingBill = await db.$queryRawUnsafe<any[]>(`
      SELECT id, "rentAmount", "waterAmount" FROM monthly_bills
      WHERE "tenantId" = $1 AND month >= $2 AND month < $3
      LIMIT 1
    `, tenantId, currentMonthStart, nextMonthStart);

    if (existingBill.length > 0) {
      const bill = existingBill[0];
      const newTotal = Number(bill.rentAmount) + Number(bill.waterAmount) + garbageAmount;
      await db.$executeRawUnsafe(`
        UPDATE monthly_bills SET "garbageAmount" = $1, "totalAmount" = $2, "updatedAt" = $3
        WHERE id = $4
      `, garbageAmount, newTotal, now, bill.id);
    } else {
      const billId = `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const rentAmount = Number(tenant.rentAmount) || 0;
      await db.$executeRawUnsafe(`
        INSERT INTO monthly_bills (
          id, "tenantId", "unitId", month, "rentAmount", "waterAmount", "garbageAmount",
          "totalAmount", status, "dueDate", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, 0, $6, $7,
          'PENDING'::"BillStatus", $8, $9, $9
        )
      `, billId, tenantId, tenant.unitId, currentMonthStart,
         rentAmount, garbageAmount, rentAmount + garbageAmount,
         new Date(now.getFullYear(), now.getMonth() + 1, 5), now);
    }

    return NextResponse.json({ success: true, message: "Garbage fee set successfully" });
  } catch (error: any) {
    console.error("❌ Error setting garbage fee:", error);
    return NextResponse.json({ error: "Failed to set garbage fee", details: error.message }, { status: 500 });
  }
}
