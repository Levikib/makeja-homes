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

    const body = await request.json();
    const { tenantId, amount, isApplicable } = body;

    console.log("🗑️ Setting garbage fee for tenant:", tenantId);

    // Validate inputs
    if (!tenantId) {
      return NextResponse.json(
        { error: "Missing tenant ID" },
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

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const garbageAmount = isApplicable ? amount : 0;

    // Check if garbage fee already exists for this month
    const existingFee = await prisma.garbage_fees.findUnique({
      where: {
        tenantId_month: {
          tenantId: tenant.id,
          month: currentMonthStart,
        },
      },
    });

    if (existingFee) {
      // Update existing fee
      await prisma.garbage_fees.update({
        where: { id: existingFee.id },
        data: {
          amount: garbageAmount,
          isApplicable,
          updatedAt: new Date(),
        },
      });
      console.log("✅ Updated garbage fee");
    } else {
      // Create new fee
      await prisma.garbage_fees.create({
        data: {
          id: `garbage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId: tenant.id,
          unitId: tenant.unitId,
          month: currentMonthStart,
          amount: garbageAmount,
          isApplicable,
          status: "PENDING",
          updatedAt: new Date(),
        },
      });
      console.log("✅ Created garbage fee");
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
          garbageAmount,
          totalAmount: Number(existingBill.rentAmount) + Number(existingBill.waterAmount) + garbageAmount,
          updatedAt: new Date(),
        },
      });
      console.log("✅ Updated monthly bill with garbage fee");
    } else {
      // Create new bill
      await prisma.monthly_bills.create({
        data: {
          id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId: tenant.id,
          unitId: tenant.unitId,
          month: currentMonthStart,
          rentAmount: tenant.rentAmount || 0,
          waterAmount: 0,
          garbageAmount,
          totalAmount: (tenant.rentAmount || 0) + garbageAmount,
          dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 5),
          status: "PENDING",
          updatedAt: new Date(),
        },
      });
      console.log("✅ Created new monthly bill with garbage fee");
    }

    return NextResponse.json({
      success: true,
      message: "Garbage fee set successfully",
    });
  } catch (error: any) {
    console.error("❌ Error setting garbage fee:", error);
    return NextResponse.json(
      { error: "Failed to set garbage fee", details: error.message },
      { status: 500 }
    );
  }
}

