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
    const db = getPrismaForRequest(request);
    const properties = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM properties WHERE "deletedAt" IS NULL ORDER BY name ASC`
    );
    return NextResponse.json(properties);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching properties:", error);
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

    const db = getPrismaForRequest(request);
    const id = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    await db.$executeRawUnsafe(
      `INSERT INTO properties (id, name, address, city, state, country, "postalCode", type, description,
        "managerIds", "caretakerIds", "storekeeperIds", "createdById", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::text[],$11::text[],$12::text[],$13,$14,$14)`,
      id,
      data.name.trim(),
      data.address.trim(),
      data.city.trim(),
      data.state || null,
      data.country.trim(),
      data.postalCode || null,
      data.type || "RESIDENTIAL",
      data.description || null,
      Array.isArray(data.managerIds) ? data.managerIds : [],
      Array.isArray(data.caretakerIds) ? data.caretakerIds : [],
      Array.isArray(data.storekeeperIds) ? data.storekeeperIds : [],
      userId,
      now,
    );

    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM properties WHERE id = $1`, id);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating property:", error);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}
