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

async function ensureTables(db: any) {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      "orderNumber" TEXT NOT NULL,
      supplier TEXT NOT NULL,
      "supplierContact" TEXT,
      "supplierEmail" TEXT,
      "supplierPhone" TEXT,
      "propertyId" TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      "orderDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "expectedDelivery" TIMESTAMPTZ,
      "receivedDate" TIMESTAMPTZ,
      notes TEXT,
      "totalAmount" NUMERIC NOT NULL DEFAULT 0,
      "createdById" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch(() => {});

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      "purchaseOrderId" TEXT NOT NULL,
      "inventoryItemId" TEXT,
      "itemName" TEXT NOT NULL,
      description TEXT,
      quantity NUMERIC NOT NULL DEFAULT 1,
      "unitCost" NUMERIC NOT NULL DEFAULT 0,
      "totalCost" NUMERIC NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'units',
      "addToInventory" BOOLEAN NOT NULL DEFAULT FALSE,
      "newInventoryData" JSONB,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch(() => {});

  // Add columns for existing tables
  for (const col of [
    `ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS "addToInventory" BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS "newInventoryData" JSONB`,
  ]) {
    await db.$executeRawUnsafe(col).catch(() => {});
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getPrismaForRequest(request);
    await ensureTables(db);

    const orders = await db.$queryRawUnsafe<any[]>(`
      SELECT po.*, p.name as "propertyName"
      FROM purchase_orders po
      LEFT JOIN properties p ON p.id = po."propertyId"
      ORDER BY po."createdAt" DESC
    `);

    // Fetch line items for all orders in one query
    const orderIds = orders.map(o => o.id);
    let lineItemsMap: Record<string, any[]> = {};
    if (orderIds.length > 0) {
      const placeholders = orderIds.map((_: any, i: number) => `$${i + 1}`).join(", ");
      const items = await db.$queryRawUnsafe<any[]>(
        `SELECT * FROM purchase_order_items WHERE "purchaseOrderId" IN (${placeholders}) ORDER BY "createdAt"`,
        ...orderIds
      ).catch(() => []);
      items.forEach((item: any) => {
        if (!lineItemsMap[item.purchaseOrderId]) lineItemsMap[item.purchaseOrderId] = [];
        lineItemsMap[item.purchaseOrderId].push(item);
      });
    }

    return NextResponse.json(orders.map(o => ({
      ...o,
      properties: o.propertyId ? { id: o.propertyId, name: o.propertyName } : null,
      lineItems: lineItemsMap[o.id] ?? [],
    })));
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      supplier, supplierContact, supplierEmail, supplierPhone,
      propertyId, orderDate, expectedDelivery, notes,
      lineItems,
    } = body;

    if (!supplier || !propertyId || !orderDate || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate line items
    for (const item of lineItems) {
      if (!item.itemName || !item.quantity || item.unitCost === undefined) {
        return NextResponse.json({ error: "Each line item needs itemName, quantity, and unitCost" }, { status: 400 });
      }
    }

    const db = getPrismaForRequest(request);
    await ensureTables(db);

    const totalAmount = lineItems.reduce(
      (sum: number, item: any) => sum + (parseFloat(item.quantity) * parseFloat(item.unitCost)),
      0
    );

    const count = await db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM purchase_orders`).catch(() => [{ c: 0 }]);
    const orderNumber = `PO-${String((count[0]?.c ?? 0) + 1).padStart(5, "0")}`;

    const id = `po_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    await db.$executeRawUnsafe(
      `INSERT INTO purchase_orders (id, "orderNumber", supplier, "supplierContact", "supplierEmail", "supplierPhone", "propertyId", status, "orderDate", "expectedDelivery", notes, "totalAmount", "createdById", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9, $10, $11, $12, $13, $13)`,
      id, orderNumber, supplier,
      supplierContact || null, supplierEmail || null, supplierPhone || null,
      propertyId, new Date(orderDate),
      expectedDelivery ? new Date(expectedDelivery) : null,
      notes || null, totalAmount, user.id, now
    );

    // Insert line items
    for (const item of lineItems) {
      const qty = parseFloat(item.quantity);
      const uc = parseFloat(item.unitCost);
      const itemId = `poi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const addToInv = !!(item.addToInventory && !item.inventoryItemId);
      const newInvData = addToInv && item.newInventoryData ? JSON.stringify(item.newInventoryData) : null;
      await db.$executeRawUnsafe(
        `INSERT INTO purchase_order_items (id, "purchaseOrderId", "inventoryItemId", "itemName", description, quantity, "unitCost", "totalCost", unit, "addToInventory", "newInventoryData", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
        itemId, id,
        item.inventoryItemId || null,
        item.itemName,
        item.description || null,
        qty, uc, qty * uc,
        item.unit || "units",
        addToInv,
        newInvData,
        now
      );
    }

    // Return order with line items
    const orderRow = await db.$queryRawUnsafe<any[]>(`SELECT po.*, p.name as "propertyName" FROM purchase_orders po LEFT JOIN properties p ON p.id = po."propertyId" WHERE po.id = $1`, id);
    const itemRows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM purchase_order_items WHERE "purchaseOrderId" = $1`, id);

    const o = orderRow[0];
    return NextResponse.json({
      ...o,
      properties: o.propertyId ? { id: o.propertyId, name: o.propertyName } : null,
      lineItems: itemRows,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 });
  }
}
