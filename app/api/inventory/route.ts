import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Validation schema for inventory item creation
const inventoryItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  sku: z.string().optional(),
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
  minimumQuantity: z.number().int().min(0, "Minimum quantity cannot be negative"),
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  unitCost: z.number().min(0, "Unit cost cannot be negative"),
  location: z.string().optional(),
  supplier: z.string().optional(),
  supplierContact: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/inventory - List inventory items with filters
export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "MANAGER", "STOREKEEPER", "TECHNICAL"]);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const lowStock = searchParams.get("lowStock") === "true";
    const search = searchParams.get("search");

    // Build where clause
    const where: Prisma.InventoryItemWhereInput = {
      deletedAt: null,
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: {
        name: "asc",
      },
    });

    // Filter for low stock if requested
    let filteredItems = items;
    if (lowStock) {
      filteredItems = items.filter(
        (item) => item.quantity <= item.minimumQuantity
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredItems,
    });
  } catch (error: any) {
    console.error("Error fetching inventory items:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch inventory items",
      },
      { status: error.status || 500 }
    );
  }
}

// POST /api/inventory - Create new inventory item
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(["ADMIN", "STOREKEEPER"]);

    const body = await req.json();
    const validatedData = inventoryItemSchema.parse(body);

    // Check if SKU already exists
    if (validatedData.sku) {
      const existingSku = await prisma.inventoryItem.findFirst({
        where: {
          sku: validatedData.sku,
          deletedAt: null,
        },
      });

      if (existingSku) {
        return NextResponse.json(
          {
            success: false,
            error: "An item with this SKU already exists",
          },
          { status: 400 }
        );
      }
    }

    // Calculate total value
    const totalValue = validatedData.quantity * validatedData.unitCost;

    const item = await prisma.inventoryItem.create({
      data: {
        ...validatedData,
        unitCost: new Prisma.Decimal(validatedData.unitCost),
        totalValue: new Prisma.Decimal(totalValue),
        createdById: user.id,
      },
    });

    // Create initial inventory movement
    await prisma.inventoryMovement.create({
      data: {
        inventoryItemId: item.id,
        type: "IN",
        quantity: validatedData.quantity,
        reason: "Initial stock",
        performedById: user.id,
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entityType: "InventoryItem",
        entityId: item.id,
        details: `Created inventory item: ${item.name} (${item.quantity} ${item.unitOfMeasure})`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: item,
        message: "Inventory item created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating inventory item:", error);

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
        error: error.message || "Failed to create inventory item",
      },
      { status: error.status || 500 }
    );
  }
}
