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

async function ensureExpensesTable(db: any) {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amount NUMERIC NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      date TIMESTAMPTZ NOT NULL,
      "propertyId" TEXT NOT NULL,
      "paymentMethod" TEXT,
      notes TEXT,
      "receiptUrl" TEXT,
      "sourceType" TEXT,
      "sourceId" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch(() => {});
  // Add source columns if missing (for existing tables)
  for (const col of [
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS "sourceType" TEXT`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS "sourceId" TEXT`,
  ]) {
    await db.$executeRawUnsafe(col).catch(() => {});
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getPrismaForRequest(request);
    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT po.*, p.name as "propertyName", p.id as "propId"
      FROM purchase_orders po
      LEFT JOIN properties p ON p.id = po."propertyId"
      WHERE po.id = $1
    `, params.id);

    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const lineItems = await db.$queryRawUnsafe<any[]>(
      `SELECT poi.*, i.name as "currentItemName", i.quantity as "currentStock", i."minimumQuantity" as "reorderLevel"
       FROM purchase_order_items poi
       LEFT JOIN inventory_items i ON i.id = poi."inventoryItemId"
       WHERE poi."purchaseOrderId" = $1
       ORDER BY poi."createdAt"`,
      params.id
    ).catch(() => []);

    const o = rows[0];
    return NextResponse.json({
      ...o,
      properties: o.propId ? { id: o.propId, name: o.propertyName } : null,
      lineItems,
    });
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    return NextResponse.json({ error: "Failed to fetch purchase order" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { status } = body;
    const validStatuses = ["DRAFT", "PENDING", "APPROVED", "RECEIVED", "CANCELLED"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);
    const now = new Date();

    // Fetch the order before update
    const orderRows = await db.$queryRawUnsafe<any[]>(`
      SELECT po.*, p.name as "propertyName"
      FROM purchase_orders po
      LEFT JOIN properties p ON p.id = po."propertyId"
      WHERE po.id = $1
    `, params.id);
    if (!orderRows.length) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const order = orderRows[0];

    const isReceiving = status === "RECEIVED" && order.status !== "RECEIVED";

    if (status === "RECEIVED") {
      await db.$executeRawUnsafe(
        `UPDATE purchase_orders SET status = $1, "receivedDate" = $2, "updatedAt" = $3 WHERE id = $4`,
        status, now, now, params.id
      );
    } else {
      await db.$executeRawUnsafe(
        `UPDATE purchase_orders SET status = $1, "updatedAt" = $2 WHERE id = $3`,
        status, now, params.id
      );
    }

    // ── When order is marked RECEIVED ──────────────────────────────────────
    if (isReceiving) {
      const lineItems = await db.$queryRawUnsafe<any[]>(
        `SELECT * FROM purchase_order_items WHERE "purchaseOrderId" = $1`, params.id
      ).catch(() => []);

      for (const item of lineItems) {
        const qty = Number(item.quantity);
        const unitCost = Number(item.unitCost);

        // 1. Update inventory stock for items linked to inventory
        if (item.inventoryItemId) {
          await db.$executeRawUnsafe(
            `UPDATE inventory_items SET quantity = quantity + $1, "updatedAt" = $2 WHERE id = $3`,
            qty, now, item.inventoryItemId
          ).catch(() => {});

          // Record inventory movement
          await db.$executeRawUnsafe(
            `INSERT INTO inventory_movements (id, "inventoryItemId", type, quantity, reason, "referenceNumber", "performedById", "createdAt")
             VALUES ($1, $2, 'IN', $3, 'Purchase order received', $4, $5, $6)`,
            `inv_mv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            item.inventoryItemId, qty, order.orderNumber, user.id, now
          ).catch(() => {});
        }

        // 2. Create inventory item if flagged addToInventory (custom items)
        if (item.addToInventory && !item.inventoryItemId) {
          const newInvData = item.newInventoryData
            ? (typeof item.newInventoryData === "string" ? JSON.parse(item.newInventoryData) : item.newInventoryData)
            : null;

          const invId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await db.$executeRawUnsafe(
            `INSERT INTO inventory_items
              (id, name, description, category, quantity, "unitOfMeasure", "unitCost", "minimumQuantity",
               supplier, "supplierContact", "supplierPhone", "supplierEmail", "supplierPrice",
               "propertyId", "createdById", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)`,
            invId,
            item.itemName,
            item.description || null,
            newInvData?.category || "OTHER",
            qty,
            item.unit || "units",
            unitCost,
            parseInt(newInvData?.reorderLevel ?? "5"),
            newInvData?.supplier || order.supplier || null,
            newInvData?.supplierContact || order.supplierContact || null,
            newInvData?.supplierPhone || order.supplierPhone || null,
            newInvData?.supplierEmail || order.supplierEmail || null,
            unitCost,
            newInvData?.propertyId || order.propertyId || null,
            user.id,
            now
          ).catch((err: any) => console.error("Failed to create inventory item:", err?.message));

          // Link the PO item to the new inventory item
          await db.$executeRawUnsafe(
            `UPDATE purchase_order_items SET "inventoryItemId" = $1 WHERE id = $2`,
            invId, item.id
          ).catch(() => {});
        }
      }

      // 3. Auto-create expense from total order amount
      await ensureExpensesTable(db);
      const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await db.$executeRawUnsafe(
        `INSERT INTO expenses (id, amount, category, description, date, "propertyId", "paymentMethod", notes, "sourceType", "sourceId", "createdAt", "updatedAt")
         VALUES ($1, $2, 'MAINTENANCE', $3, $4, $5, $6, $7, 'purchase_order', $8, $9, $9)
         ON CONFLICT (id) DO NOTHING`,
        expenseId,
        Number(order.totalAmount),
        `Purchase Order ${order.orderNumber} — ${order.supplier}`,
        now,
        order.propertyId,
        "PURCHASE_ORDER",
        `Auto-recorded from PO ${order.orderNumber}. ${order.notes || ""}`.trim(),
        params.id,
        now
      ).catch((err: any) => console.error("Failed to create expense:", err?.message));
    }

    const updatedRows = await db.$queryRawUnsafe<any[]>(`
      SELECT po.*, p.name as "propertyName", p.id as "propId"
      FROM purchase_orders po
      LEFT JOIN properties p ON p.id = po."propertyId"
      WHERE po.id = $1
    `, params.id);

    const o = updatedRows[0];
    return NextResponse.json({
      ...o,
      properties: o.propId ? { id: o.propId, name: o.propertyName } : null,
    });
  } catch (error) {
    console.error("Error updating purchase order:", error);
    return NextResponse.json({ error: "Failed to update purchase order" }, { status: 500 });
  }
}
