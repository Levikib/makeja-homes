import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { unit } = body;

    if (!unit.unitNumber || !unit.type || !unit.status || !unit.rentAmount) {
      return NextResponse.json({ error: "Missing required unit fields" }, { status: 400 });
    }

    if (unit.status === "OCCUPIED" || unit.status === "RESERVED") {
      return NextResponse.json(
        { error: "Please create unit as VACANT first, then assign tenant separately" },
        { status: 400 }
      );
    }

    const db = getPrismaForRequest(request);

    // Check for duplicate unit number
    const existing = await db.$queryRawUnsafe<any[]>(
      `SELECT id FROM units WHERE "propertyId" = $1 AND "unitNumber" = $2 AND "deletedAt" IS NULL LIMIT 1`,
      params.id, unit.unitNumber
    );
    if (existing.length) {
      return NextResponse.json({ error: "Unit number already exists in this property" }, { status: 400 });
    }

    const now = new Date();
    const unitId = generateUniqueId("unit");

    await db.$executeRawUnsafe(
      `INSERT INTO units (id, "propertyId", "unitNumber", type, status, bedrooms, bathrooms, "squareFeet", floor, "rentAmount", "depositAmount", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4::"UnitType", $5::"UnitStatus", $6, $7, $8, $9, $10, $11, $12, $12)`,
      unitId, params.id, unit.unitNumber, unit.type, unit.status,
      unit.bedrooms || null, unit.bathrooms || null, unit.squareFeet || null,
      unit.floor || null, unit.rentAmount, unit.depositAmount || null, now
    );

    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM units WHERE id = $1`, unitId);
    return NextResponse.json({ unit: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating unit:", error);
    return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
  }
}
