import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { jwtVerify } from "jose";

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getPrismaForRequest(request)
    const units = await db.$queryRawUnsafe<any[]>(
      `SELECT id, "unitNumber", type::text, status::text, "rentAmount", "depositAmount", bedrooms, bathrooms, floor, "squareFeet"
       FROM units WHERE "propertyId" = $1 AND "deletedAt" IS NULL ORDER BY "unitNumber" ASC`,
      params.id
    )
    return NextResponse.json({ units })
  } catch (error) {
    console.error("Error fetching units:", error)
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))

    const data = await request.json()
    const db = getPrismaForRequest(request)

    // Check duplicate unit number
    const existing = await db.$queryRawUnsafe<any[]>(
      `SELECT id FROM units WHERE "propertyId" = $1 AND "unitNumber" = $2 AND "deletedAt" IS NULL LIMIT 1`,
      params.id, data.unitNumber
    )
    if (existing.length) {
      return NextResponse.json({ error: "A unit with this number already exists in this property" }, { status: 400 })
    }

    const id = `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()

    await db.$executeRawUnsafe(
      `INSERT INTO units (id, "propertyId", "unitNumber", type, status, "rentAmount", "depositAmount", bedrooms, bathrooms, floor, "squareFeet", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4::public."UnitType", $5::public."UnitStatus", $6, $7, $8, $9, $10, $11, $12, $12)`,
      id, params.id, data.unitNumber,
      data.type || "STUDIO",
      data.status || "VACANT",
      data.rentAmount,
      data.depositAmount || null,
      data.bedrooms || null,
      data.bathrooms || null,
      data.floor || null,
      data.squareFeet || null,
      now
    )

    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM units WHERE id = $1`, id)
    return NextResponse.json(rows[0])
  } catch (error) {
    console.error("Error creating unit:", error)
    return NextResponse.json({ error: "Failed to create unit" }, { status: 500 })
  }
}
