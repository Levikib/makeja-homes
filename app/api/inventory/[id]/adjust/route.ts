import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const adjustmentSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.number().int(),
  reason: z.string().min(1, "Reason is required"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

// POST /api/inventory/[id]/adjust - Adjust inventory quantity
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "STOREKEEPER", "TECHNICAL"]);

    const body = await req.json();
    const validatedData = adjustmentSchema.parse(body);

    // Get current item
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
    });

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: "Inventory item not found",
        },
        { status: 404 }
      );
    }

    // Calculate new quantity
    let newQuantity = item.quantity;
    let actualQuantityChange = validatedData.quantity;

    if (validatedData.type === "IN") {
      newQuantity += validatedData.quantity;
    } else if (validatedData.type === "OUT") {
      if (item.quantity < validatedData.quantity) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock. Current quantity: ${item.quantity}`,
          },
          { status: 400 }
        );
      }
      newQuantity -= validatedData.quantity;
      actualQuantityChange = -validatedData.quantity;
    } else {
      // ADJUSTMENT - set to exact quantity
      actualQuantityChange = validatedData.quantity - item.quantity;
      newQuantity = validatedData.quantity;
    }

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create movement record
      const movement = await tx.inventoryMovement.create({
        data: {
          id: crypto.randomUUID(),
          inventoryItemId: item.id,
          type: validatedData.type,
          quantity: actualQuantityChange,
          reason: validatedData.reason,
          referenceNumber: validatedData.referenceNumber,
          notes: validatedData.notes,
          performedById: user.id,
        },
      });

      // Update item quantity and value
      const newTotalValue = newQuantity * item.unitCost.toNumber();

      const updatedItem = await tx.inventoryItem.update({
        where: {
          id: params.id,
        },
        data: {
          quantity: newQuantity,
          totalValue: new Prisma.Decimal(newTotalValue),
        },
      });

      return { movement, updatedItem };
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        action: "UPDATE",
        entityType: "InventoryItem",
        entityId: item.id,
        details: `${validatedData.type} - ${Math.abs(actualQuantityChange)} ${item.unitOfMeasure} of ${item.name}. Reason: ${validatedData.reason}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        movement: result.movement,
        item: result.updatedItem,
      },
      message: "Inventory adjusted successfully",
    });
  } catch (error: any) {
    console.error("Error adjusting inventory:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to adjust inventory",
      },
      { status: error.status || 500 }
    );
  }
}
