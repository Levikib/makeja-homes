import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

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

    const { unitId, readingDate, previousReading, currentReading, ratePerUnit, notes } = await request.json();

    if (!unitId || !readingDate || previousReading === undefined || currentReading === undefined || !ratePerUnit) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (currentReading < previousReading) {
      return NextResponse.json({ error: "Current reading cannot be less than previous reading" }, { status: 400 });
    }

    const waterReading = await prisma.waterReadings.create({
      data: {
        unitId,
        readingDate: new Date(readingDate),
        previousReading: parseFloat(previousReading),
        currentReading: parseFloat(currentReading),
        ratePerUnit: parseFloat(ratePerUnit),
        notes,
      },
    });

    return NextResponse.json(waterReading, { status: 201 });
  } catch (error) {
    console.error("Error creating water reading:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
