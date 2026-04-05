import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN","MANAGER","CARETAKER"].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getPrismaForRequest(request)

    const props = await db.$queryRawUnsafe<any[]>(`SELECT * FROM properties WHERE id = $1 LIMIT 1`, params.id)
    if (!props.length) return NextResponse.json({ error: "Property not found" }, { status: 404 })

    const units = await db.$queryRawUnsafe<any[]>(`
      SELECT u.*, 
        CASE WHEN t.id IS NOT NULL THEN json_build_object(
          'id', t.id, 'leaseStartDate', t."leaseStartDate", 'leaseEndDate', t."leaseEndDate",
          'rentAmount', t."rentAmount", 'depositAmount', t."depositAmount",
          'users', json_build_object(
            'id', usr.id, 'firstName', usr."firstName", 'lastName', usr."lastName",
            'email', usr.email, 'phoneNumber', usr."phoneNumber", 'isActive', usr."isActive"
          )
        ) ELSE NULL END as "currentTenant"
      FROM units u
      LEFT JOIN tenants t ON t."unitId" = u.id AND t."leaseEndDate" >= NOW()
      LEFT JOIN users usr ON usr.id = t."userId" AND usr."isActive" = true
      WHERE u."propertyId" = $1 AND u."deletedAt" IS NULL
      ORDER BY u."unitNumber" ASC
    `, params.id)

    return NextResponse.json({ ...props[0], units })
  } catch (error) {
    console.error("Error fetching property details:", error)
    return NextResponse.json({ error: "Failed to fetch property" }, { status: 500 })
  }
}
