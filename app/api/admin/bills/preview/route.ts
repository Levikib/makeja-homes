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

    // Get all active tenants
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

    // Get property with recurring charges
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
    const preview = [];

    for (const tenant of tenants) {
      // Check if bill already exists
      const existingBill = await prisma.monthly_bills.findFirst({
        where: {
          tenantId: tenant.id,
          month: billDate,
        },
      });

      const rentAmount = tenant.rentAmount;

      // Water charges
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

      // Garbage fees
      let garbageAmount = 0;
      if (property.chargesGarbageFee) {
        const garbageFee = await prisma.garbage_fees.findFirst({
          where: {
            tenantId: tenant.id,
            month: billDate,
          },
        });
        garbageAmount = garbageFee?.amount || property.defaultGarbageFee || 0;
      }

      // Recurring charges
      const applicableCharges = [];
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
          applicableCharges.push({
            name: charge.name,
            amount: charge.amount,
          });
        }
      }

      const totalAmount = rentAmount + waterAmount + garbageAmount + recurringChargesTotal;

      preview.push({
        tenant: {
          id: tenant.id,
          name: `${tenant.users.firstName} ${tenant.users.lastName}`,
          email: tenant.users.email,
        },
        unit: {
          number: tenant.units.unitNumber,
        },
        breakdown: {
          rent: rentAmount,
          water: waterAmount,
          garbage: garbageAmount,
          recurringCharges: applicableCharges,
          recurringChargesTotal: recurringChargesTotal,
          total: totalAmount,
        },
        billExists: !!existingBill,
      });
    }

    return NextResponse.json({
      preview,
      summary: {
        totalTenants: preview.length,
        tenantsWithExistingBills: preview.filter(p => p.billExists).length,
        newBillsToGenerate: preview.filter(p => !p.billExists).length,
        totalAmount: preview.reduce((sum, p) => sum + p.breakdown.total, 0),
      },
    });
  } catch (error: any) {
    console.error("❌ Error generating bill preview:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 }
    );
  }
}
