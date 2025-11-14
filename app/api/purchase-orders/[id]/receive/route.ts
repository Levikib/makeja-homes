import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const receiveSchema = z.object({
  receivedDate: z.string().optional(),
  notes: z.string().optional(),
});

// POST /api/purchase-orders/[id]/receive - Receive and process a purchase order
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "STOREKEEPER"]);

    const body = await req.json();
    const validatedData = receiveSchema.parse(body);

    // Check if order exists
    const existingOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
      include: {
        items: {
          where: {
            deletedAt: null,
          },
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "Purchase order not found",
        },
        { status: 404 }
      );
    }

    // Check if order is in APPROVED status
    if (existingOrder.status !== "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot receive purchase order with status: ${existingOrder.status}. Order must be approved first.`,
        },
        { status: 400 }
      );
    }

    // Process receipt in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update order status
      const order = await tx.purchaseOrder.update({
        where: {
          id: params.id,
        },
        data: {
          status: "RECEIVED",
          receivedById: user.id,
          receivedAt: validatedData.receivedDate
            ? new Date(validatedData.receivedDate)
            : new Date(),
          deliveryNotes: validatedData.notes,
        },
      });

      // Update inventory quantities and create movements
      for (const item of existingOrder.items) {
        if (item.inventoryItem) {
          const newQuantity = item.inventoryItem.quantity + item.quantity;
          const newTotalValue =
            newQuantity * item.inventoryItem.unitCost.toNumber();

          // Update inventory item
          await tx.inventoryItem.update({
            where: {
              id: item.inventoryItemId,
            },
            data: {
              quantity: newQuantity,
              totalValue: new Prisma.Decimal(newTotalValue),
            },
          });

          // Create inventory movement
          await tx.inventoryMovement.create({
            data: {
              inventoryItemId: item.inventoryItemId,
              type: "IN",
              quantity: item.quantity,
              reason: `Purchase Order ${existingOrder.orderNumber}`,
              referenceNumber: existingOrder.orderNumber,
              performedById: user.id,
            },
          });
        }
      }

      return order;
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entityType: "PurchaseOrder",
        entityId: result.id,
        details: `Received purchase order: ${result.orderNumber}. Updated inventory for ${existingOrder.items.length} items.`,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Purchase order received and inventory updated successfully",
    });
  } catch (error: any) {
    console.error("Error receiving purchase order:", error);

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
        error: error.message || "Failed to receive purchase order",
      },
      { status: error.status || 500 }
    );
  }
}
