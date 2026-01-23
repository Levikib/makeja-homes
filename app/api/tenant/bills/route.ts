import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "TENANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get tenant record
    const tenant = await prisma.tenants.findUnique({
      where: { userId: userId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get all bills for this tenant
    const bills = await prisma.monthly_bills.findMany({
      where: {
        tenantId: tenant.id,
      },
      include: {
        units: {
          include: {
            properties: true,
          },
        },
      },
      orderBy: {
        month: "desc",
      },
    });

    // Format response
    const formattedBills = bills.map((bill) => ({
      id: bill.id,
      month: bill.month,
      rentAmount: bill.rentAmount,
      waterAmount: bill.waterAmount,
      garbageAmount: bill.garbageAmount,
      totalAmount: bill.totalAmount,
      status: bill.status,
      dueDate: bill.dueDate,
      paidDate: bill.paidDate,
      property: {
        name: bill.units.properties.name,
        paystackActive: bill.units.properties.paystackActive,
      },
      unit: {
        unitNumber: bill.units.unitNumber,
      },
    }));

    return NextResponse.json({
      bills: formattedBills,
    });
  } catch (error: any) {
    console.error("❌ Error fetching tenant bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}
