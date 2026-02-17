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
    const role = payload.role as string;
    const userId = payload.id as string;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      tenantId,
      previousReading,
      currentReading,
      usage,
      ratePerUnit,
      amountDue,
      month,
      year,
    } = body;

    if (!tenantId || previousReading === undefined || currentReading === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get tenant's unitId
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { unitId: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // ✅ FIX: Check by unitId, month, year (matches the unique constraint)
    const existingReading = await prisma.water_readings.findFirst({
      where: {
        unitId: tenant.unitId,  // ✅ FIXED - check unitId not tenantId
        month,
        year,
      },
    });

    if (existingReading) {
      // Update existing reading
      const waterReading = await prisma.water_readings.update({
        where: { id: existingReading.id },
        data: {
          previousReading,
          currentReading,
          unitsConsumed: usage,
          ratePerUnit,
          amountDue,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Water reading updated successfully",
        waterReading,
      });
    } else {
      // Create new reading
      const waterReading = await prisma.water_readings.create({
        data: {
          id: `water_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          previousReading,
          currentReading,
          unitsConsumed: usage,
          ratePerUnit,
          amountDue,
          month,
          year,
          users: {
            connect: { id: userId },
          },
          tenants: {
            connect: { id: tenantId },
          },
          units: {
            connect: { id: tenant.unitId },
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Water reading created successfully",
        waterReading,
      });
    }
  } catch (error: any) {
    console.error("❌ Error saving water reading:", error);
    return NextResponse.json(
      { error: "Failed to save water reading", details: error.message },
      { status: 500 }
    );
  }
}
