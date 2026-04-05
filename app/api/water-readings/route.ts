import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForTenant } from "@/lib/prisma";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "ADMIN" && payload.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { unitId, tenantId, readingDate, previousReading, currentReading, ratePerUnit, notes } = await request.json();

    if (!unitId || !readingDate || previousReading === undefined || currentReading === undefined || !ratePerUnit) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (currentReading < previousReading) {
      return NextResponse.json({ error: "Current reading cannot be less than previous reading" }, { status: 400 });
    }

    const prev = parseFloat(previousReading);
    const curr = parseFloat(currentReading);
    const rate = parseFloat(ratePerUnit);
    const consumed = curr - prev;
    const amount = consumed * rate;
    const date = new Date(readingDate);

    const waterReading = await getPrismaForTenant(request).water_readings.create({
      data: {
        id: crypto.randomUUID(),
        unitId,
        tenantId: tenantId || null,
        readingDate: date,
        previousReading: prev,
        currentReading: curr,
        unitsConsumed: consumed,
        amountDue: amount,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        recordedBy: payload.id as string,
        ratePerUnit: rate,
        notes: notes || null,
      },
    });

    return NextResponse.json(waterReading, { status: 201 });
  } catch (error) {
    console.error("Error creating water reading:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
