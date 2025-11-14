import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// POST /api/purchase-orders/[id]/approve - Approve a submitted purchase order
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);

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

    // Check if order is in SUBMITTED status
    if (existingOrder.status !== "SUBMITTED") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot approve purchase order with status: ${existingOrder.status}`,
        },
        { status: 400 }
      );
    }

    // Approve the order
    const order = await prisma.purchaseOrder.update({
      where: {
        id: params.id,
      },
      data: {
        status: "APPROVED",
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entityType: "PurchaseOrder",
        entityId: order.id,
        details: `Approved purchase order: ${order.orderNumber}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: order,
      message: "Purchase order approved successfully",
    });
  } catch (error: any) {
    console.error("Error approving purchase order:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to approve purchase order",
      },
      { status: error.status || 500 }
    );
  }
}
