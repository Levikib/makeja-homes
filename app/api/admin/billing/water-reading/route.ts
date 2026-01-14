import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    const body = await request.json();
    const { tenantId, previousReading, currentReading, ratePerUnit } = body;

    console.log("💧 Adding water reading for tenant:", tenantId);

    // Validate inputs
    if (!tenantId || previousReading === undefined || currentReading === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get tenant details
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Calculate consumption
    const unitsConsumed = Math.max(0, currentReading - previousReading);
    const amountDue = unitsConsumed * ratePerUnit;

    // Get current month and year
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const currentMonthStart = new Date(year, now.getMonth(), 1);

    // Check if reading already exists for this month
    const existingReading = await prisma.water_readings.findUnique({
      where: {
        unitId_month_year: {
          unitId: tenant.unitId,
          month,
          year,
        },
      },
    });

    if (existingReading) {
      // Update existing reading
      const updatedReading = await prisma.water_readings.update({
        where: { id: existingReading.id },
        data: {
          previousReading,
          currentReading,
          unitsConsumed,
          ratePerUnit,
          amountDue,
          readingDate: now,
        },
      });

      console.log("✅ Updated water reading:", updatedReading.id);
    } else {
      // Create new reading
      const newReading = await prisma.water_readings.create({
        data: {
          id: `water_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          unitId: tenant.unitId,
          tenantId: tenant.id,
          previousReading,
          currentReading,
          unitsConsumed,
          ratePerUnit,
          amountDue,
          readingDate: now,
          month,
          year,
          recordedBy: userId,
        },
      });

      console.log("✅ Created water reading:", newReading.id);
    }

    // Update or create monthly bill
    const existingBill = await prisma.monthly_bills.findFirst({
      where: {
        tenantId: tenant.id,
        month: currentMonthStart,
      },
    });

    if (existingBill) {
      // Update existing bill
      await prisma.monthly_bills.update({
        where: { id: existingBill.id },
        data: {
          waterAmount: amountDue,
          totalAmount: Number(existingBill.rentAmount) + amountDue + Number(existingBill.garbageAmount),
          updatedAt: new Date(),
        },
      });
      console.log("✅ Updated monthly bill with water amount");
    } else {
      // Create new bill
      await prisma.monthly_bills.create({
        data: {
          id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId: tenant.id,
          unitId: tenant.unitId,
          month: currentMonthStart,
          rentAmount: tenant.rentAmount || 0,
          waterAmount: amountDue,
          garbageAmount: 0,
          totalAmount: (tenant.rentAmount || 0) + amountDue,
          dueDate: new Date(year, now.getMonth() + 1, 5),
          status: "PENDING",
          updatedAt: new Date(),
        },
      });
      console.log("✅ Created new monthly bill with water amount");
    }

    return NextResponse.json({
      success: true,
      message: "Water reading added successfully",
      reading: {
        unitsConsumed,
        amountDue,
      },
    });
  } catch (error: any) {
    console.error("❌ Error adding water reading:", error);
    return NextResponse.json(
      { error: "Failed to add water reading", details: error.message },
      { status: 500 }
    );
  }
}