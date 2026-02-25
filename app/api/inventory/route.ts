import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, category, quantity, unit, unitCost, reorderLevel, propertyId } = body;

    // Validate required fields
    if (!name || !category || quantity === undefined || !unit || unitCost === undefined || reorderLevel === undefined || !propertyId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create inventory item
    const item = await prisma.inventory_items.create({
      data: {
        id: crypto.randomUUID(),
        name,
        description,
        category,
        quantity: parseInt(quantity),
        unitOfMeasure: unit,
        unitCost: parseFloat(unitCost),
        minimumQuantity: parseInt(reorderLevel),
        createdById: (session.user as any).id,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
