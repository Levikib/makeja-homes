import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, category, quantity, unit, unitCost, reorderLevel, propertyId } = body;

    const item = await prisma.inventory_items.update({
      where: { id: params.id },
      data: {
        name,
        description,
        category,
        quantity: parseInt(quantity),
        unit,
        unitCost: parseFloat(unitCost),
        reorderLevel: parseInt(reorderLevel),
        propertyId,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
