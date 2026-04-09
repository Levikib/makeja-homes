import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

async function getAuth(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    return payload;
  } catch { return null; }
}

async function ensureInventoryTables(db: any) {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      "unitOfMeasure" TEXT NOT NULL DEFAULT 'units',
      "unitCost" NUMERIC NOT NULL DEFAULT 0,
      "minimumQuantity" INTEGER NOT NULL DEFAULT 0,
      supplier TEXT,
      "supplierContact" TEXT,
      "supplierPhone" TEXT,
      "supplierEmail" TEXT,
      "supplierPrice" NUMERIC,
      sku TEXT,
      "propertyId" TEXT,
      "createdById" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch(() => {});

  // Add supplier columns if they don't exist yet (for existing tables)
  for (const col of [
    `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier TEXT`,
    `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS "supplierContact" TEXT`,
    `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS "supplierPhone" TEXT`,
    `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS "supplierEmail" TEXT`,
    `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS "supplierPrice" NUMERIC`,
    `ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sku TEXT`,
  ]) {
    await db.$executeRawUnsafe(col).catch(() => {});
  }

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      "inventoryItemId" TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reason TEXT,
      "referenceNumber" TEXT,
      "maintenanceRequestId" TEXT,
      notes TEXT,
      "performedById" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch(() => {});

  await db.$executeRawUnsafe(
    `ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS "maintenanceRequestId" TEXT`
  ).catch(() => {});
}

export async function GET(request: NextRequest) {
  const user = await getAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getPrismaForRequest(request);
    await ensureInventoryTables(db);
    const items = await db.$queryRawUnsafe<any[]>(`
      SELECT i.*, p.name as "propertyName"
      FROM inventory_items i
      LEFT JOIN properties p ON p.id = i."propertyId"
      ORDER BY i.name ASC
    `);
    return NextResponse.json(items.map(i => ({
      ...i,
      properties: i.propertyId ? { name: i.propertyName } : null,
    })));
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      name, description, category, quantity, unit, unitCost, reorderLevel, propertyId,
      supplier, supplierContact, supplierPhone, supplierEmail, supplierPrice, sku,
    } = body;

    if (!name || !category || quantity === undefined || !unit || unitCost === undefined || reorderLevel === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);
    await ensureInventoryTables(db);
    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    await db.$executeRawUnsafe(
      `INSERT INTO inventory_items
        (id, name, description, category, quantity, "unitOfMeasure", "unitCost", "minimumQuantity",
         supplier, "supplierContact", "supplierPhone", "supplierEmail", "supplierPrice", sku,
         "propertyId", "createdById", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17)`,
      id, name, description || null, category,
      parseInt(quantity), unit, parseFloat(unitCost), parseInt(reorderLevel),
      supplier || null, supplierContact || null, supplierPhone || null,
      supplierEmail || null, supplierPrice ? parseFloat(supplierPrice) : null, sku || null,
      propertyId || null, user.id, now
    );

    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM inventory_items WHERE id = $1`, id);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
  }
}
