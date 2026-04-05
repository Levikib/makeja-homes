import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN", "MANAGER", "CARETAKER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const prisma = getPrismaForRequest(request)

    const tenants = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        t.id, t."userId", t."unitId", t."leaseStartDate", t."leaseEndDate",
        t."rentAmount", t."depositAmount", t."createdAt", t."updatedAt",
        u.id as "user_id", u."firstName", u."lastName", u.email,
        u."phoneNumber", u."isActive",
        un."unitNumber", un."propertyId",
        p.id as "property_id", p.name as "property_name"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE u."isActive" = true
      ORDER BY t."createdAt" DESC
    `)

    // Shape into the format the UI expects
    const shaped = tenants.map(row => ({
      id: row.id,
      userId: row.userId,
      unitId: row.unitId,
      leaseStartDate: row.leaseStartDate,
      leaseEndDate: row.leaseEndDate,
      rentAmount: row.rentAmount,
      depositAmount: row.depositAmount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      users: {
        id: row.user_id,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phoneNumber: row.phoneNumber,
        isActive: row.isActive,
      },
      units: {
        id: row.unitId,
        unitNumber: row.unitNumber,
        properties: {
          id: row.property_id,
          name: row.property_name,
        },
      },
    }))

    return NextResponse.json(shaped);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}
