import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Validation schema for inventory item update
const inventoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().min(1).optional(),
  sku: z.string().optional(),
  minimumQuantity: z.number().int().min(0).optional(),
  unitOfMeasure: z.string().min(1).optional(),
  unitCost: z.number().min(0).optional(),
  location: z.string().optional(),
  supplier: z.string().optional(),
  supplierContact: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/inventory/[id] - Get single inventory item with movement history
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["ADMIN", "MANAGER", "STOREKEEPER", "TECHNICAL"]);

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
      include: {
        movements: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
          include: {
            performedBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        purchaseOrderItems: {
          where: {
            deletedAt: null,
          },
          include: {
            purchaseOrder: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                orderDate: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
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

    // Check if item is low stock
    const isLowStock = item.quantity <= item.minimumQuantity;

    return NextResponse.json({
      success: true,
      data: {
        ...item,
        isLowStock,
      },
    });
  } catch (error: any) {
    console.error("Error fetching inventory item:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch inventory item",
      },
      { status: error.status || 500 }
    );
  }
}

// PUT /api/inventory/[id] - Update inventory item
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "STOREKEEPER"]);

    const body = await req.json();
    const validatedData = inventoryUpdateSchema.parse(body);

    // Check if item exists
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        {
          success: false,
          error: "Inventory item not found",
        },
        { status: 404 }
      );
    }

    // If updating SKU, check for duplicates
    if (validatedData.sku && validatedData.sku !== existingItem.sku) {
      const duplicateSku = await prisma.inventoryItem.findFirst({
        where: {
          sku: validatedData.sku,
          deletedAt: null,
          NOT: {
            id: params.id,
          },
        },
      });

      if (duplicateSku) {
        return NextResponse.json(
          {
            success: false,
            error: "An item with this SKU already exists",
          },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData };

    // If unit cost is updated, recalculate total value
    if (validatedData.unitCost !== undefined) {
      updateData.unitCost = new Prisma.Decimal(validatedData.unitCost);
      updateData.totalValue = new Prisma.Decimal(
        validatedData.unitCost * existingItem.quantity
      );
    }

    const item = await prisma.inventoryItem.update({
      where: {
        id: params.id,
      },
      data: updateData,
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entityType: "InventoryItem",
        entityId: item.id,
        details: `Updated inventory item: ${item.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: item,
      message: "Inventory item updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating inventory item:", error);

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
        error: error.message || "Failed to update inventory item",
      },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/inventory/[id] - Soft delete inventory item
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN"]);

    // Check if item exists
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        {
          success: false,
          error: "Inventory item not found",
        },
        { status: 404 }
      );
    }

    // Soft delete the item
    const item = await prisma.inventoryItem.update({
      where: {
        id: params.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        entityType: "InventoryItem",
        entityId: item.id,
        details: `Deleted inventory item: ${item.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Inventory item deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete inventory item",
      },
      { status: error.status || 500 }
    );
  }
}
