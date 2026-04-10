import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const body = await request.json();
    const { tenantId, previousReading, currentReading, ratePerUnit } = body;

    if (!tenantId || previousReading === undefined || currentReading === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    // Get tenant details including rentAmount
    const tenantRows = await db.$queryRawUnsafe<any[]>(
      `SELECT id, "unitId", "rentAmount" FROM tenants WHERE id = $1 LIMIT 1`, tenantId
    );
    if (!tenantRows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const { unitId, rentAmount } = tenantRows[0];

    const unitsConsumed = Math.max(0, currentReading - previousReading);
    const amountDue = unitsConsumed * (ratePerUnit ?? 0);

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const currentMonthStart = new Date(year, now.getMonth(), 1);

    // Upsert water reading
    const existing = await db.$queryRawUnsafe<any[]>(
      `SELECT id FROM water_readings WHERE "unitId" = $1 AND month = $2 AND year = $3 LIMIT 1`,
      unitId, month, year
    );

    if (existing.length) {
      await db.$executeRawUnsafe(
        `UPDATE water_readings
         SET "previousReading" = $1, "currentReading" = $2, "unitsConsumed" = $3,
             "ratePerUnit" = $4, "amountDue" = $5, "readingDate" = $6
         WHERE id = $7`,
        previousReading, currentReading, unitsConsumed, ratePerUnit, amountDue, now, existing[0].id
      );
    } else {
      const readingId = `water_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.$executeRawUnsafe(
        `INSERT INTO water_readings
           (id, "unitId", "tenantId", "previousReading", "currentReading", "unitsConsumed",
            "ratePerUnit", "amountDue", "readingDate", month, year, "recordedBy", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $9)`,
        readingId, unitId, tenantId,
        previousReading, currentReading, unitsConsumed,
        ratePerUnit, amountDue, now, month, year, userId
      );
    }

    // Upsert monthly bill — update waterAmount and recalculate total
    const existingBill = await db.$queryRawUnsafe<any[]>(
      `SELECT id, "rentAmount", "garbageAmount" FROM monthly_bills WHERE "tenantId" = $1 AND month = $2 LIMIT 1`,
      tenantId, currentMonthStart
    );

    if (existingBill.length) {
      const bill = existingBill[0];
      const total = Number(bill.rentAmount) + amountDue + Number(bill.garbageAmount ?? 0);
      await db.$executeRawUnsafe(
        `UPDATE monthly_bills SET "waterAmount" = $1, "totalAmount" = $2, "updatedAt" = $3 WHERE id = $4`,
        amountDue, total, now, bill.id
      );
    } else {
      const billId = `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const dueDate = new Date(year, now.getMonth() + 1, 5);
      await db.$executeRawUnsafe(
        `INSERT INTO monthly_bills
           (id, "tenantId", "unitId", month, "rentAmount", "waterAmount", "garbageAmount",
            "totalAmount", "dueDate", status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, 'PENDING', $9, $9)`,
        billId, tenantId, unitId, currentMonthStart,
        Number(rentAmount ?? 0), amountDue,
        Number(rentAmount ?? 0) + amountDue,
        dueDate, now
      );
    }

    return NextResponse.json({
      success: true,
      message: "Water reading added successfully",
      reading: { unitsConsumed, amountDue },
    });
  } catch (error: any) {
    console.error("❌ Error adding water reading:", error);
    return NextResponse.json({ error: "Failed to add water reading" }, { status: 500 });
  }
}
