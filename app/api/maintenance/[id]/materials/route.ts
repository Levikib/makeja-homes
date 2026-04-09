import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

async function getAuth(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    return payload;
  } catch { return null; }
}

async function ensureMaterialsTables(db: any) {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS maintenance_materials (
      id TEXT PRIMARY KEY,
      "maintenanceRequestId" TEXT NOT NULL,
      "inventoryItemId" TEXT,
      "itemName" TEXT NOT NULL,
      quantity NUMERIC NOT NULL DEFAULT 1,
      "unitCost" NUMERIC NOT NULL DEFAULT 0,
      "totalCost" NUMERIC NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'units',
      "recordedById" TEXT,
      "deductedFromInventory" BOOLEAN NOT NULL DEFAULT FALSE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch(() => {});
}

// GET /api/maintenance/[id]/materials — list materials used
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getPrismaForRequest(req);
    await ensureMaterialsTables(db);

    const materials = await db.$queryRawUnsafe<any[]>(`
      SELECT mm.*,
        i.name as "currentInventoryName", i.quantity as "currentStock",
        i."unitOfMeasure" as "inventoryUnit", i."unitCost" as "inventoryUnitCost"
      FROM maintenance_materials mm
      LEFT JOIN inventory_items i ON i.id = mm."inventoryItemId"
      WHERE mm."maintenanceRequestId" = $1
      ORDER BY mm."createdAt"
    `, params.id).catch(() => []);

    const totals = materials.reduce(
      (acc: any, m: any) => ({
        totalCost: acc.totalCost + Number(m.totalCost ?? 0),
        count: acc.count + 1,
      }),
      { totalCost: 0, count: 0 }
    );

    return NextResponse.json({ materials, totals });
  } catch (error: any) {
    console.error("[materials GET]", error?.message);
    return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 });
  }
}

// POST /api/maintenance/[id]/materials — record material used, optionally deduct from inventory
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "MANAGER", "CARETAKER", "STOREKEEPER"].includes(user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { inventoryItemId, itemName, quantity, unitCost, unit, deductFromInventory } = body;

    if (!itemName || !quantity) {
      return NextResponse.json({ error: "itemName and quantity are required" }, { status: 400 });
    }

    const db = getPrismaForRequest(req);
    await ensureMaterialsTables(db);
    const now = new Date();

    const qty = parseFloat(quantity);
    const uc = parseFloat(unitCost ?? 0);
    const totalCost = qty * uc;

    // If linked to inventory, verify stock
    if (inventoryItemId && deductFromInventory) {
      const stockRows = await db.$queryRawUnsafe<any[]>(
        `SELECT id, name, quantity, "unitOfMeasure", "unitCost" FROM inventory_items WHERE id = $1 LIMIT 1`,
        inventoryItemId
      );
      if (!stockRows.length) {
        return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
      }
      const stock = stockRows[0];
      if (Number(stock.quantity) < qty) {
        return NextResponse.json({
          error: `Insufficient stock. Available: ${stock.quantity} ${stock.unitOfMeasure}`,
          available: Number(stock.quantity),
        }, { status: 400 });
      }

      // Deduct from inventory
      await db.$executeRawUnsafe(
        `UPDATE inventory_items SET quantity = quantity - $1, "updatedAt" = $2 WHERE id = $3`,
        qty, now, inventoryItemId
      );

      // Record movement
      await db.$executeRawUnsafe(
        `INSERT INTO inventory_movements (id, "inventoryItemId", type, quantity, reason, "referenceNumber", "maintenanceRequestId", "performedById", "createdAt")
         VALUES ($1, $2, 'OUT', $3, 'Used in maintenance', $4, $5, $6, $7)`,
        `inv_mv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        inventoryItemId, qty, params.id, params.id, user.id, now
      ).catch(() => {});
    }

    // Record material
    const id = `mm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await db.$executeRawUnsafe(
      `INSERT INTO maintenance_materials (id, "maintenanceRequestId", "inventoryItemId", "itemName", quantity, "unitCost", "totalCost", unit, "recordedById", "deductedFromInventory", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      id, params.id,
      inventoryItemId || null, itemName,
      qty, uc, totalCost,
      unit || "units", user.id,
      !!(inventoryItemId && deductFromInventory),
      now
    );

    // Log activity
    await db.$executeRawUnsafe(
      `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
       VALUES ($1, $2, 'MATERIAL_USED', 'MaintenanceRequest', $3, $4::jsonb, $5)
       ON CONFLICT DO NOTHING`,
      `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      user.id, params.id,
      JSON.stringify({ itemName, quantity: qty, totalCost, deducted: !!(inventoryItemId && deductFromInventory) }),
      now
    ).catch(() => {});

    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM maintenance_materials WHERE id = $1`, id
    );

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error("[materials POST]", error?.message);
    return NextResponse.json({ error: error.message || "Failed to record material" }, { status: 500 });
  }
}

// DELETE /api/maintenance/[id]/materials?materialId=xxx
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "MANAGER"].includes(user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const materialId = searchParams.get("materialId");
    if (!materialId) return NextResponse.json({ error: "materialId required" }, { status: 400 });

    const db = getPrismaForRequest(req);
    await db.$executeRawUnsafe(
      `DELETE FROM maintenance_materials WHERE id = $1 AND "maintenanceRequestId" = $2`,
      materialId, params.id
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete material" }, { status: 500 });
  }
}
