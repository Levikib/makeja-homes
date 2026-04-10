import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { logActivity } from "@/lib/log-activity";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { tenantId, unitId, month, rentAmount, waterAmount, garbageAmount, dueDate } = body;

    if (!tenantId || !unitId || !month || rentAmount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const billDate = new Date(month);
    const billMonthStart = new Date(billDate.getFullYear(), billDate.getMonth(), 1);
    const billMonthEnd = new Date(billDate.getFullYear(), billDate.getMonth() + 1, 1);
    const totalAmount = (rentAmount || 0) + (waterAmount || 0) + (garbageAmount || 0);

    const db = getPrismaForRequest(request);

    const existing = await db.$queryRawUnsafe<any[]>(`
      SELECT id FROM monthly_bills
      WHERE "tenantId" = $1 AND month >= $2 AND month < $3
      LIMIT 1
    `, tenantId, billMonthStart, billMonthEnd);

    if (existing.length > 0) {
      return NextResponse.json({ error: "Bill already exists for this month" }, { status: 400 });
    }

    const billId = `bill_manual_${Date.now()}_${tenantId}`;
    const now = new Date();

    await db.$executeRawUnsafe(`
      INSERT INTO monthly_bills (
        id, "tenantId", "unitId", month, "rentAmount", "waterAmount", "garbageAmount",
        "totalAmount", status, "dueDate", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        'PENDING'::"BillStatus", $9, $10, $10
      )
    `, billId, tenantId, unitId, billMonthStart,
       rentAmount || 0, waterAmount || 0, garbageAmount || 0, totalAmount,
       new Date(dueDate), now);

    await logActivity(db, {
      userId: payload.id as string,
      action: "BILL_CREATED",
      entityType: "monthly_bill",
      entityId: billId,
      details: { tenantId, unitId, month: billMonthStart, totalAmount },
    });

    return NextResponse.json({
      success: true,
      message: "Bill created successfully",
      bill: { id: billId, tenantId, unitId, month: billMonthStart, rentAmount, waterAmount, garbageAmount, totalAmount, status: "PENDING", dueDate },
    });
  } catch (error: any) {
    console.error("❌ Error creating bill:", error);
    return NextResponse.json({ error: "Failed to create bill" }, { status: 500 });
  }
}
