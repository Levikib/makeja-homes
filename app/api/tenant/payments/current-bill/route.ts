import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    console.log("💳 Fetching current bill for user:", userId);

    // Get tenant
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

    // Get current month's bill
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const currentBill = await prisma.monthly_bills.findFirst({
      where: {
        tenantId: tenant.id,
        month: currentMonthStart,
      },
    });

    if (!currentBill) {
      return NextResponse.json(
        { error: "No bill found for current month" },
        { status: 404 }
      );
    }

    // Check if already paid
    const isPaid = currentBill.status === "PAID";

    const response = {
      bill: {
        id: currentBill.id,
        month: currentBill.month,
        rentAmount: Number(currentBill.rentAmount),
        waterAmount: Number(currentBill.waterAmount),
        garbageAmount: Number(currentBill.garbageAmount),
        totalAmount: Number(currentBill.totalAmount),
        status: currentBill.status,
        dueDate: currentBill.dueDate,
        paidDate: currentBill.paidDate,
        isPaid,
      },
      tenant: {
        name: tenant.units.properties.name,
        unit: tenant.units.unitNumber,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("❌ Error fetching current bill:", error);
    return NextResponse.json(
      { error: "Failed to fetch bill" },
      { status: 500 }
    );
  }
}