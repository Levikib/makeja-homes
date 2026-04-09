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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getPrismaForRequest(request);
    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT i.*, p.name as "propertyName"
      FROM inventory_items i
      LEFT JOIN properties p ON p.id = i."propertyId"
      WHERE i.id = $1
    `, params.id);

    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const movements = await db.$queryRawUnsafe<any[]>(`
      SELECT im.*, u."firstName", u."lastName"
      FROM inventory_movements im
      LEFT JOIN users u ON u.id = im."performedById"
      WHERE im."inventoryItemId" = $1
      ORDER BY im."createdAt" DESC
      LIMIT 20
    `, params.id).catch(() => []);

    const r = rows[0];
    return NextResponse.json({
      ...r,
      properties: r.propertyId ? { name: r.propertyName } : null,
      movements,
    });
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}

// PATCH — update item (supports supplier fields + records adjustment movement)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "MANAGER", "STOREKEEPER"].includes(user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      name, description, category, quantity, unit, unitCost, reorderLevel, propertyId, sku,
      supplier, supplierContact, supplierPhone, supplierEmail, supplierPrice,
    } = body;

    if (!name || !category || quantity === undefined || !unit || unitCost === undefined || reorderLevel === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);
    const now = new Date();

    const existing = await db.$queryRawUnsafe<any[]>(
      `SELECT quantity FROM inventory_items WHERE id = $1 LIMIT 1`, params.id
    );
    if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const prevQty = Number(existing[0].quantity);
    const newQty = parseInt(quantity);
    const diff = newQty - prevQty;

    await db.$executeRawUnsafe(
      `UPDATE inventory_items SET
        name = $1, description = $2, category = $3, quantity = $4,
        "unitOfMeasure" = $5, "unitCost" = $6, "minimumQuantity" = $7,
        "propertyId" = $8, sku = $9,
        supplier = $10, "supplierContact" = $11, "supplierPhone" = $12,
        "supplierEmail" = $13, "supplierPrice" = $14,
        "updatedAt" = $15
       WHERE id = $16`,
      name, description || null, category,
      newQty, unit, parseFloat(unitCost), parseInt(reorderLevel),
      propertyId || null, sku || null,
      supplier || null, supplierContact || null, supplierPhone || null,
      supplierEmail || null, supplierPrice ? parseFloat(supplierPrice) : null,
      now, params.id
    );

    // Record adjustment movement if quantity changed
    if (diff !== 0) {
      await db.$executeRawUnsafe(
        `INSERT INTO inventory_movements (id, "inventoryItemId", type, quantity, reason, "performedById", "createdAt")
         VALUES ($1, $2, 'ADJUSTMENT', $3, $4, $5, $6)`,
        `inv_mv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        params.id, Math.abs(diff),
        diff > 0 ? `Adjusted up by ${diff} (manual edit)` : `Adjusted down by ${Math.abs(diff)} (manual edit)`,
        user.id, now
      ).catch(() => {});
    }

    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT i.*, p.name as "propertyName"
      FROM inventory_items i LEFT JOIN properties p ON p.id = i."propertyId"
      WHERE i.id = $1
    `, params.id);

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

// Keep PUT for backwards compat (used by old edit form if any)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return PATCH(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "MANAGER"].includes(user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const db = getPrismaForRequest(request);
    const existing = await db.$queryRawUnsafe<any[]>(
      `SELECT id FROM inventory_items WHERE id = $1 LIMIT 1`, params.id
    );
    if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.$executeRawUnsafe(`DELETE FROM inventory_items WHERE id = $1`, params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
