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
    const {
      tenantId,
      unitId,
      month,
      rentAmount,
      waterAmount,
      garbageAmount,
      dueDate,
    } = body;

    if (!tenantId || !unitId || !month || rentAmount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const billDate = new Date(month);
    const totalAmount = (rentAmount || 0) + (waterAmount || 0) + (garbageAmount || 0);

    // Check for existing bill
    const existingBill = await prisma.monthly_bills.findFirst({
      where: {
        tenantId: tenantId,
        month: billDate,
      },
    });

    if (existingBill) {
      return NextResponse.json(
        { error: "Bill already exists for this month" },
        { status: 400 }
      );
    }

    // Create bill
    const bill = await prisma.monthly_bills.create({
      data: {
        id: `bill_manual_${Date.now()}_${tenantId}`,
        tenantId,
        unitId,
        month: billDate,
        rentAmount: rentAmount || 0,
        waterAmount: waterAmount || 0,
        garbageAmount: garbageAmount || 0,
        totalAmount,
        status: "PENDING",
        dueDate: new Date(dueDate),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Bill created successfully",
      bill,
    });
  } catch (error: any) {
    console.error("❌ Error creating bill:", error);
    return NextResponse.json(
      { error: "Failed to create bill" },
      { status: 500 }
    );
  }
}
