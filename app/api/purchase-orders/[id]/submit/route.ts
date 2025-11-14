import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// POST /api/purchase-orders/[id]/submit - Submit a draft purchase order
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "STOREKEEPER"]);

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

    // Check if order is in DRAFT status
    if (existingOrder.status !== "DRAFT") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot submit purchase order with status: ${existingOrder.status}`,
        },
        { status: 400 }
      );
    }

    // Submit the order
    const order = await prisma.purchaseOrder.update({
      where: {
        id: params.id,
      },
      data: {
        status: "SUBMITTED",
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entityType: "PurchaseOrder",
        entityId: order.id,
        details: `Submitted purchase order: ${order.orderNumber}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: order,
      message: "Purchase order submitted successfully",
    });
  } catch (error: any) {
    console.error("Error submitting purchase order:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to submit purchase order",
      },
      { status: error.status || 500 }
    );
  }
}
