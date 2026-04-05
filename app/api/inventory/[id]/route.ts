import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { jwtVerify } from "jose";

export const dynamic = 'force-dynamic'

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
    const rows = await db.$queryRawUnsafe<any[]>(`SELECT i.*, p.name as "propertyName" FROM inventory_items i LEFT JOIN properties p ON p.id = i."propertyId" WHERE i.id = $1 LIMIT 1`, params.id);
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const r = rows[0];
    return NextResponse.json({ ...r, properties: r.propertyId ? { name: r.propertyName } : null });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, description, category, quantity, unit, unitCost, reorderLevel, propertyId } = body;
    const db = getPrismaForRequest(request);
    const now = new Date();

    await db.$executeRawUnsafe(
      `UPDATE inventory_items SET name=$2, description=$3, category=$4, quantity=$5, "unitOfMeasure"=$6, "unitCost"=$7, "minimumQuantity"=$8, "updatedAt"=$9 WHERE id=$1`,
      params.id, name, description || null, category, parseInt(quantity), unit, parseFloat(unitCost), parseInt(reorderLevel), now
    );

    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM inventory_items WHERE id = $1`, params.id);
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json({ error: "Failed to update inventory item" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getPrismaForRequest(request);
    await db.$executeRawUnsafe(`DELETE FROM inventory_items WHERE id = $1`, params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
