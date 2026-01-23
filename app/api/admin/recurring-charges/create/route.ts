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
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      propertyIds,
      name,
      description,
      category,
      amount,
      frequency,
      billingDay,
      appliesTo,
      specificUnits,
      unitTypes,
    } = body;

    // Validation
    if (!propertyIds || propertyIds.length === 0 || !name || !category || amount === undefined || !frequency) {
      return NextResponse.json(
        { error: "Missing required fields. At least one property must be selected." },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Generate unique ID
    const chargeId = `charge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Create recurring charge
    const recurringCharge = await prisma.recurringCharges.create({
      data: {
        id: chargeId,
        propertyIds: propertyIds,
        name,
        description: description || null,
        category,
        amount: parseFloat(amount),
        frequency,
        billingDay: parseInt(billingDay) || 1,
        appliesTo: appliesTo || "ALL_UNITS",
        specificUnits: specificUnits || [],
        unitTypes: unitTypes || [],
        isActive: true,
        createdById: userId,
        updatedAt: now,
      },
      include: {
        users: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Recurring charge created successfully",
      charge: recurringCharge,
    });
  } catch (error: any) {
    console.error("❌ Error creating recurring charge:", error);
    return NextResponse.json(
      { error: "Failed to create recurring charge" },
      { status: 500 }
    );
  }
}
