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
        { status: 400 }
      );
    }

    // Get property details including recurring charges
    const property = await prisma.properties.findUnique({
      where: { id: propertyId },
      include: {
        recurringCharges: {
          where: { isActive: true },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const billDate = new Date(year, month - 1, 1);
    const dueDate = new Date(year, month - 1, 5); // Due on 5th of month
    const generatedBills = [];

    // Generate bill for each tenant
    for (const tenant of tenants) {
      // Check if bill already exists for this month
      const existingBill = await prisma.monthly_bills.findFirst({
        where: {
          tenantId: tenant.id,
          month: billDate,
        },
      });

      if (existingBill) {
        continue; // Skip if bill already exists
      }

      // 1. Base rent
      const rentAmount = tenant.rentAmount;

      // 2. Water charges (get latest reading)
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
          // Use default garbage fee
          garbageAmount = property.defaultGarbageFee || 0;
        }
      }

      // 4. Recurring charges that apply to this unit
      let recurringChargesTotal = 0;
      for (const charge of property.recurringCharges) {
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
      const bill = await prisma.monthly_bills.create({
        data: {
          id: `bill_${Date.now()}_${tenant.id}`,
          tenantId: tenant.id,
          unitId: tenant.unitId,
          month: billDate,
          rentAmount: rentAmount,
          waterAmount: waterAmount,
          garbageAmount: garbageAmount,
          totalAmount: totalAmount,
          status: "PENDING",
          dueDate: dueDate,
        },
      });

      generatedBills.push(bill);
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedBills.length} bills for ${month}/${year}`,
      bills: generatedBills,
      stats: {
        totalBills: generatedBills.length,
        totalAmount: generatedBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
      },
    });
  } catch (error: any) {
    console.error("❌ Error generating bills:", error);
    return NextResponse.json(
      { error: "Failed to generate bills" },
      { status: 500 }
    );
  }
}
