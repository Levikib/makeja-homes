import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// GET /api/purchase-orders/[id] - Get single purchase order
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["ADMIN", "MANAGER", "STOREKEEPER"]);

    const order = await prisma.purchaseOrder.findFirst({
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
            inventoryItem: {
              select: {
                id: true,
                name: true,
                category: true,
                unitOfMeasure: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Purchase order not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error("Error fetching purchase order:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch purchase order",
      },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/purchase-orders/[id] - Soft delete purchase order
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN"]);

    // Check if order exists
    const existingOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
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

    // Only allow deletion of DRAFT or CANCELLED orders
    if (!["DRAFT", "CANCELLED"].includes(existingOrder.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete purchase order with status: ${existingOrder.status}`,
        },
        { status: 400 }
      );
    }

    // Soft delete the order and its items
    await prisma.$transaction([
      prisma.purchaseOrder.update({
        where: { id: params.id },
        data: { deletedAt: new Date() },
      }),
      prisma.purchaseOrderItem.updateMany({
        where: { purchaseOrderId: params.id },
        data: { deletedAt: new Date() },
      }),
    ]);

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        entityType: "PurchaseOrder",
        entityId: existingOrder.id,
        details: `Deleted purchase order: ${existingOrder.orderNumber}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Purchase order deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting purchase order:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete purchase order",
      },
      { status: error.status || 500 }
    );
  }
}
