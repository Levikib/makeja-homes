import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Charge ID is required" },
        { status: 400 }
      );
    }

    if (!updateData.propertyIds || updateData.propertyIds.length === 0) {
      return NextResponse.json(
        { error: "At least one property must be selected" },
        { status: 400 }
      );
    }

    // Parse billingDay to integer
    const dataToUpdate: any = {
      propertyIds: updateData.propertyIds,
      name: updateData.name,
      description: updateData.description || null,
      category: updateData.category,
      amount: parseFloat(updateData.amount),
      frequency: updateData.frequency,
      billingDay: parseInt(updateData.billingDay) || 1,
      appliesTo: updateData.appliesTo || "ALL_UNITS",
      specificUnits: updateData.specificUnits || [],
      unitTypes: updateData.unitTypes || [],
      updatedAt: new Date(),
    };

    // Update recurring charge
    const recurringCharge = await prisma.recurringCharges.update({
      where: { id },
      data: dataToUpdate,
      include: {
        users: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Fetch property names
    const properties = await prisma.properties.findMany({
      where: {
        id: {
          in: recurringCharge.propertyIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Recurring charge updated successfully",
      charge: {
        ...recurringCharge,
        properties,
      },
    });
  } catch (error: any) {
    console.error("❌ Error updating recurring charge:", error);
    return NextResponse.json(
      { error: "Failed to update recurring charge" },
      { status: 500 }
    );
  }
}
