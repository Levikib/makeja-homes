import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) throw new Error("Unauthorized");
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload;
}

export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    if (!["ADMIN", "MANAGER", "CARETAKER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const properties = await getPrismaForRequest(request).properties.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(properties);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    if (!["ADMIN", "MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const userId = payload.id as string;

    const data = await request.json();

    if (!data.name?.trim() || !data.address?.trim() || !data.city?.trim() || !data.country?.trim()) {
      return NextResponse.json({ error: "Name, address, city and country are required" }, { status: 400 });
    }

    const db = getPrismaForRequest(request)

    // Drop the broken createdById FK if it exists (may reference wrong schema from old prisma db push)
    // This is idempotent — safe to run every time
    try {
      await db.$executeRawUnsafe(`ALTER TABLE properties DROP CONSTRAINT IF EXISTS "properties_createdById_fkey"`)
    } catch {}

    const propId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const managerIds = Array.isArray(data.managerIds) ? data.managerIds : []
    const caretakerIds = Array.isArray(data.caretakerIds) ? data.caretakerIds : []
    const storekeeperIds = Array.isArray(data.storekeeperIds) ? data.storekeeperIds : []

    await db.$executeRawUnsafe(`
      INSERT INTO properties (
        id, name, address, city, state, country, "postalCode", type, description,
        "managerIds", "caretakerIds", "storekeeperIds", "createdById", "updatedAt", "createdAt",
        "totalUnits", "isActive"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, NOW(), NOW(),
        0, true
      )
    `,
      propId, data.name.trim(), data.address.trim(), data.city.trim(),
      data.state || null, data.country.trim(), data.postalCode || null,
      data.type || 'RESIDENTIAL', data.description || null,
      JSON.stringify(managerIds), JSON.stringify(caretakerIds), JSON.stringify(storekeeperIds),
      userId
    )

    const property = await db.properties.findUnique({ where: { id: propId } })
    return NextResponse.json(property, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating property:", error);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}
