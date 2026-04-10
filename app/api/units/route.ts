import { getPrismaForRequest } from "@/lib/get-prisma";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export const dynamic = 'force-dynamic'

// GET all units with optional filters
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN", "MANAGER", "CARETAKER", "STOREKEEPER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const db = getPrismaForRequest(request);

    const conditions = [`un."deletedAt" IS NULL`];
    const args: any[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`un.status::text = $${idx++}`);
      args.push(status);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const units = await db.$queryRawUnsafe<any[]>(`
      SELECT un.id, un."unitNumber", un.type::text AS type, un.status::text AS status,
        un."rentAmount", un."depositAmount", un.bedrooms, un.bathrooms,
        un."squareFeet", un.floor, un."propertyId", un."createdAt", un."updatedAt",
        p.id AS "propId", p.name AS "propName", p.address AS "propAddress"
      FROM units un
      JOIN properties p ON p.id = un."propertyId"
      ${where}
      ORDER BY p.name ASC, un."unitNumber" ASC
    `, ...args);

    const formatted = units.map(u => ({
      id: u.id,
      unitNumber: u.unitNumber,
      type: u.type,
      status: u.status,
      rentAmount: Number(u.rentAmount),
      depositAmount: Number(u.depositAmount),
      bedrooms: u.bedrooms,
      bathrooms: u.bathrooms,
      squareFeet: u.squareFeet,
      floor: u.floor,
      propertyId: u.propertyId,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      properties: { id: u.propId, name: u.propName, address: u.propAddress },
    }));

    return NextResponse.json({ units: formatted, total: formatted.length });
  } catch (error) {
    console.error("Error fetching units:", error);
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
  }
}

// POST create new unit
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "Use property-specific endpoint to create units" },
    { status: 400 }
  );
}
