import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { unitId, readingDate, previousReading, currentReading, ratePerUnit, notes } = await request.json();

    // Validate
    if (!unitId || !readingDate || previousReading === undefined || currentReading === undefined || !ratePerUnit) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (currentReading < previousReading) {
      return NextResponse.json({ error: "Current reading cannot be less than previous reading" }, { status: 400 });
    }

    // Create water reading - USE waterReadings (camelCase)
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
