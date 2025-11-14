import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Validation schema for purchase order creation
const purchaseOrderItemSchema = z.object({
  inventoryItemId: z.string().min(1),
  itemName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  totalPrice: z.number().positive(),
});

const purchaseOrderSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  vendorContact: z.string().optional(),
  vendorEmail: z.string().email().optional(),
  vendorAddress: z.string().optional(),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one item is required"),
});

// GET /api/purchase-orders - List purchase orders
export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "MANAGER", "STOREKEEPER"]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // Build where clause
    const where: Prisma.PurchaseOrderWhereInput = {
      deletedAt: null,
    };

    if (status) {
      where.status = status as any;
    }

    const orders = await prisma.purchaseOrder.findMany({
      where,
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
              },
            },
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        approvedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        receivedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            items: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: {
        orderDate: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error("Error fetching purchase orders:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch purchase orders",
      },
      { status: error.status || 500 }
    );
  }
}

// POST /api/purchase-orders - Create new purchase order
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(["ADMIN", "STOREKEEPER"]);

    const body = await req.json();
    const validatedData = purchaseOrderSchema.parse(body);

    // Calculate totals
    const subtotal = validatedData.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );
    const taxAmount = subtotal * 0.075; // 7.5% tax
    const totalAmount = subtotal + taxAmount;

    // Generate order number
    const orderNumber = `PO-${Date.now()}`;

    // Create purchase order with items in transaction
    const order = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          vendorName: validatedData.vendorName,
          vendorContact: validatedData.vendorContact,
          vendorEmail: validatedData.vendorEmail,
          vendorAddress: validatedData.vendorAddress,
          orderDate: validatedData.orderDate
            ? new Date(validatedData.orderDate)
            : new Date(),
          expectedDeliveryDate: validatedData.expectedDeliveryDate
            ? new Date(validatedData.expectedDeliveryDate)
            : undefined,
          status: "DRAFT",
          subtotal: new Prisma.Decimal(subtotal),
          taxAmount: new Prisma.Decimal(taxAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          notes: validatedData.notes,
          createdById: user.id,
        },
      });

      // Create order items
      const items = await Promise.all(
        validatedData.items.map((item) =>
          tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId: po.id,
              inventoryItemId: item.inventoryItemId,
              itemName: item.itemName,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              totalPrice: new Prisma.Decimal(item.totalPrice),
            },
          })
        )
      );

      return { ...po, items };
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entityType: "PurchaseOrder",
        entityId: order.id,
        details: `Created purchase order ${orderNumber} for ${validatedData.vendorName}`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: order,
        message: "Purchase order created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating purchase order:", error);

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
        error: error.message || "Failed to create purchase order",
      },
      { status: error.status || 500 }
    );
  }
}
