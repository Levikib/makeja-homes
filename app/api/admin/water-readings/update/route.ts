import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (!["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, previousReading, currentReading, ratePerUnit, unitsConsumed, amountDue } = body;

    if (!id) return NextResponse.json({ error: "Reading ID required" }, { status: 400 });

    const db = getPrismaForRequest(request);

    const existing = await db.$queryRawUnsafe<any[]>(
      `SELECT id FROM water_readings WHERE id = $1 LIMIT 1`, id
    );
    if (!existing.length) return NextResponse.json({ error: "Reading not found" }, { status: 404 });

    await db.$executeRawUnsafe(
      `UPDATE water_readings
       SET "previousReading" = $1, "currentReading" = $2, "ratePerUnit" = $3,
           "unitsConsumed" = $4, "amountDue" = $5
       WHERE id = $6`,
      previousReading, currentReading, ratePerUnit, unitsConsumed, amountDue, id
    );

    const updated = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM water_readings WHERE id = $1`, id
    );

    return NextResponse.json({ success: true, message: "Reading updated successfully", reading: updated[0] });
  } catch (error: any) {
    console.error("Error updating water reading:", error);
    return NextResponse.json({ error: "Failed to update reading" }, { status: 500 });
  }
}
