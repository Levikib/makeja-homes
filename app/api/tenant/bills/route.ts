import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get token
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    console.log("💰 Fetching bills for user:", userId);

    // Get tenant record
    const tenant = await prisma.tenants.findFirst({
      where: { userId },
      include: {
        units: {
          include: {
            properties: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant record not found" },
        { status: 404 }
      );
    }

    console.log("✅ Found tenant:", tenant.id);

    // Get current month start and end
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get current month's bill
    let currentBill = await prisma.monthly_bills.findFirst({
      where: {
        tenantId: tenant.id,
        month: currentMonthStart,
      },
    });

    // If no bill exists, create one
    if (!currentBill) {
      // Get latest water reading for current month
      const waterReading = await prisma.water_readings.findFirst({
        where: {
          tenantId: tenant.id,
          readingDate: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
        },
        orderBy: { readingDate: "desc" },
      });

      // Get garbage fee for current month
      const garbageFee = await prisma.garbage_fees.findFirst({
        where: {
          tenantId: tenant.id,
          month: currentMonthStart,
        },
      });

      const rentAmount = tenant.rentAmount || 0;
      const waterAmount = waterReading?.amountDue || 0;
      const garbageAmount = garbageFee?.amount || 0;
      const totalAmount = rentAmount + waterAmount + garbageAmount;

      // Create the bill
      currentBill = await prisma.monthly_bills.create({
        data: {
          id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId: tenant.id,
          unitId: tenant.unitId,
          month: currentMonthStart,
          rentAmount,
          waterAmount,
          garbageAmount,
          totalAmount,
          dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 5), // Due on 5th of next month
          status: "PENDING",
          updatedAt: new Date(),
        },
      });

      console.log("✅ Created new bill for current month");
    }

    // Get bill history (last 12 months)
    const billHistory = await prisma.monthly_bills.findMany({
      where: {
        tenantId: tenant.id,
      },
      orderBy: {
        month: "desc",
      },
      take: 12,
    });

    // Get current month's water reading details
    const currentWaterReading = await prisma.water_readings.findFirst({
      where: {
        tenantId: tenant.id,
        readingDate: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      orderBy: { readingDate: "desc" },
    });

    // Get current month's garbage fee details
    const currentGarbageFee = await prisma.garbage_fees.findFirst({
      where: {
        tenantId: tenant.id,
        month: currentMonthStart,
      },
    });

    const response = {
      tenant: {
        id: tenant.id,
        unitNumber: tenant.units.unitNumber,
        propertyName: tenant.units.properties.name,
      },
      currentBill: {
        id: currentBill.id,
        month: currentBill.month,
        rent: Number(currentBill.rentAmount),
        water: Number(currentBill.waterAmount),
        garbage: Number(currentBill.garbageAmount),
        total: Number(currentBill.totalAmount),
        status: currentBill.status,
        dueDate: currentBill.dueDate,
        paidDate: currentBill.paidDate,
      },
      waterDetails: currentWaterReading
        ? {
            previousReading: Number(currentWaterReading.previousReading),
            currentReading: Number(currentWaterReading.currentReading),
            unitsConsumed: Number(currentWaterReading.unitsConsumed),
            ratePerUnit: Number(currentWaterReading.ratePerUnit),
            amount: Number(currentWaterReading.amountDue),
            readingDate: currentWaterReading.readingDate,
          }
        : null,
      garbageDetails: currentGarbageFee
        ? {
            amount: Number(currentGarbageFee.amount),
            isApplicable: currentGarbageFee.isApplicable,
          }
        : null,
      billHistory: billHistory.map((bill) => ({
        id: bill.id,
        month: bill.month,
        rent: Number(bill.rentAmount),
        water: Number(bill.waterAmount),
        garbage: Number(bill.garbageAmount),
        total: Number(bill.totalAmount),
        status: bill.status,
        dueDate: bill.dueDate,
        paidDate: bill.paidDate,
      })),
    };

    console.log("✅ Bills data prepared");

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("❌ Error fetching bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills", details: error.message },
      { status: 500 }
    );
  }
}