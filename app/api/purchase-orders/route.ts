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
    const orders = await db.$queryRawUnsafe<any[]>(`
      SELECT po.*, p.name as "propertyName"
      FROM purchase_orders po
      LEFT JOIN properties p ON p.id = po."propertyId"
      ORDER BY po."createdAt" DESC
    `);
    return NextResponse.json(orders.map(o => ({ ...o, properties: o.propertyId ? { name: o.propertyName } : null })));
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
    const { supplier, propertyId, orderDate, expectedDelivery, notes, totalAmount, lineItems } = body;

    if (!supplier || !propertyId || !orderDate || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);
    const count = await db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM purchase_orders`);
    const orderNumber = `PO-${String((count[0]?.c ?? 0) + 1).padStart(5, '0')}`;

    const id = `po_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    await db.$executeRawUnsafe(
      `INSERT INTO purchase_orders (id, "orderNumber", supplier, "propertyId", status, "orderDate", "expectedDelivery", notes, "totalAmount", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8, $9, $9)`,
      id, orderNumber, supplier, propertyId, new Date(orderDate),
      expectedDelivery ? new Date(expectedDelivery) : null, notes || null, parseFloat(totalAmount || 0), now
    );

    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM purchase_orders WHERE id = $1`, id);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 });
  }
}
