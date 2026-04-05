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

export async function GET(request: NextRequest) {
  const user = await getAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getPrismaForRequest(request);
    const items = await db.$queryRawUnsafe<any[]>(`
      SELECT i.*, p.name as "propertyName"
      FROM inventory_items i
      LEFT JOIN properties p ON p.id = i."propertyId"
      ORDER BY i.name ASC
    `);
    return NextResponse.json(items.map(i => ({ ...i, properties: i.propertyId ? { name: i.propertyName } : null })));
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
    const { name, description, category, quantity, unit, unitCost, reorderLevel, propertyId } = body;

    if (!name || !category || quantity === undefined || !unit || unitCost === undefined || reorderLevel === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);
    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    await db.$executeRawUnsafe(
      `INSERT INTO inventory_items (id, name, description, category, quantity, "unitOfMeasure", "unitCost", "minimumQuantity", "propertyId", "createdById", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
      id, name, description || null, category, parseInt(quantity), unit,
      parseFloat(unitCost), parseInt(reorderLevel), propertyId || null, user.id, now
    );

    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM inventory_items WHERE id = $1`, id);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
  }
}
