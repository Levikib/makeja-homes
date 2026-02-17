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

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { propertyId, month, year } = body;

    if (!propertyId || !month || !year) {
      return NextResponse.json(
        { error: "Property ID, month, and year required" },
        { status: 400 }
      );
    }

    // Get all active tenants for the property
    const tenants = await prisma.tenants.findMany({
      where: {
        units: {
          propertyId: propertyId,
          status: "OCCUPIED",
        },
      },
      include: {
        users: true,
        units: {
          include: {
            properties: true,
          },
        },
      },
    });

    if (tenants.length === 0) {
      return NextResponse.json(
        { error: "No active tenants found for this property" },
        { status: 404 }
      );
    }

    // Get property details (removed recurringCharges relation)
    const property = await prisma.properties.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Get recurring charges for this property (NEW: uses propertyIds array)
    const recurringCharges = await prisma.recurringCharges.findMany({
      where: {
        propertyIds: {
          has: propertyId,
        },
        isActive: true,
      },
    });

    const billDate = new Date(year, month - 1, 1);
    const generatedBills = [];
    const skippedTenants = [];

    for (const tenant of tenants) {
      // Check if bill already exists
      const existingBill = await prisma.monthly_bills.findFirst({
        where: {
          tenantId: tenant.id,
          month: billDate,
        },
      });

      if (existingBill) {
        skippedTenants.push({
          tenantName: `${tenant.users.firstName} ${tenant.users.lastName}`,
          reason: "Bill already exists",
        });
        continue;
      }

      // 1. Base rent
      const rentAmount = tenant.rentAmount;

      // 2. Water charges
      let waterAmount = 0;
      const waterReading = await prisma.water_readings.findFirst({
        where: {
          tenantId: tenant.id,
          month: month,
          year: year,
        },
      });
      if (waterReading) {
        waterAmount = waterReading.amountDue;
      }

      // 3. Garbage fees
      let garbageAmount = 0;
      if (property.chargesGarbageFee) {
        const garbageFee = await prisma.garbage_fees.findFirst({
          where: {
            tenantId: tenant.id,
            month: billDate,
          },
        });
        if (garbageFee) {
          garbageAmount = garbageFee.amount;
        } else {
          garbageAmount = property.defaultGarbageFee || 0;
        }
      }

      // 4. Recurring charges that apply to this unit
      let recurringChargesTotal = 0;
      for (const charge of recurringCharges) {
        let applies = false;

        if (charge.appliesTo === "ALL_UNITS") {
          applies = true;
        } else if (charge.appliesTo === "SPECIFIC_UNITS") {
          applies = charge.specificUnits.includes(tenant.unitId);
        } else if (charge.appliesTo === "UNIT_TYPES") {
          applies = charge.unitTypes.includes(tenant.units.type);
        }

        if (applies) {
          recurringChargesTotal += charge.amount;
        }
      }

      // Calculate total
      const totalAmount = rentAmount + waterAmount + garbageAmount + recurringChargesTotal;

      // Create the monthly bill
      const now = new Date();
      const bill = await prisma.monthly_bills.create({
        data: {
          id: `bill_${Date.now()}_${tenant.id}`,
          month: billDate,
          rentAmount,
          waterAmount,
          garbageAmount,
          totalAmount,
          status: "UNPAID",
          dueDate: new Date(year, month - 1, 5),
          updatedAt: now,
          tenants: {
            connect: {
              id: tenant.id,
            },
          },
          units: {
            connect: {
              id: tenant.unitId,
            },
          },
        },
      });

      generatedBills.push({
        billId: bill.id,
        tenantName: `${tenant.users.firstName} ${tenant.users.lastName}`,
        unitNumber: tenant.units.unitNumber,
        totalAmount: bill.totalAmount,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedBills.length} bills successfully`,
      generatedBills,
      skippedTenants,
    });
  } catch (error: any) {
    console.error("❌ Error generating bills:", error);
    return NextResponse.json(
      { error: "Failed to generate bills" },
      { status: 500 }
    );
  }
}
