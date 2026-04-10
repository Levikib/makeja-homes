import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { logActivity } from "@/lib/log-activity";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;
    const userId = payload.id as string;

    if (!["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { tenantId, previousReading, currentReading, usage, ratePerUnit, amountDue, month, year } = body;

    if (!tenantId || previousReading === undefined || currentReading === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    // Get tenant's unitId
    const tenantRows = await db.$queryRawUnsafe<any[]>(
      `SELECT id, "unitId" FROM tenants WHERE id = $1 LIMIT 1`, tenantId
    );
    if (!tenantRows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const unitId = tenantRows[0].unitId;

    const now = new Date();

    // Check for existing reading for this unit/month/year
    const existing = await db.$queryRawUnsafe<any[]>(
      `SELECT id FROM water_readings WHERE "unitId" = $1 AND month = $2 AND year = $3 LIMIT 1`,
      unitId, month, year
    );

    if (existing.length) {
      await db.$executeRawUnsafe(
        `UPDATE water_readings
         SET "previousReading" = $1, "currentReading" = $2, "unitsConsumed" = $3,
             "ratePerUnit" = $4, "amountDue" = $5
         WHERE id = $6`,
        previousReading, currentReading, usage ?? (currentReading - previousReading),
        ratePerUnit, amountDue, existing[0].id
      );
      await logActivity(db, {
        userId,
        action: "WATER_READING_UPDATED",
        entityType: "water_reading",
        entityId: existing[0].id,
        details: { tenantId, unitId, month, year, previousReading, currentReading, amountDue },
      });
      return NextResponse.json({ success: true, message: "Water reading updated successfully" });
    } else {
      const id = `water_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.$executeRawUnsafe(
        `INSERT INTO water_readings
           (id, "unitId", "tenantId", "previousReading", "currentReading", "unitsConsumed",
            "ratePerUnit", "amountDue", "readingDate", month, year, "recordedBy", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $9)`,
        id, unitId, tenantId,
        previousReading, currentReading,
        usage ?? Math.max(0, currentReading - previousReading),
        ratePerUnit, amountDue, now, month, year, userId
      );
      await logActivity(db, {
        userId,
        action: "WATER_READING_RECORDED",
        entityType: "water_reading",
        entityId: id,
        details: { tenantId, unitId, month, year, previousReading, currentReading, amountDue },
      });
      return NextResponse.json({ success: true, message: "Water reading created successfully" });
    }
  } catch (error: any) {
    console.error("❌ Error saving water reading:", error);
    return NextResponse.json({ error: "Failed to save water reading", details: error.message }, { status: 500 });
  }
}
