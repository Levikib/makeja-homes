import { jwtVerify } from "jose"
import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";


export const dynamic = 'force-dynamic'
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Auth guard
  const token = request.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN","MANAGER","CARETAKER"].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }


    const db = getPrismaForRequest(request)
    const props = await db.$queryRawUnsafe<any[]>(`SELECT * FROM properties WHERE id = $1 LIMIT 1`, params.id)
    if (!props.length) return NextResponse.json({ error: "Property not found" }, { status: 404 })

    const units = await db.$queryRawUnsafe<any[]>(
      `SELECT id, "unitNumber", type::text, status::text, "rentAmount", "depositAmount", bedrooms, bathrooms, floor, "squareFeet", "deletedAt", "createdAt", "updatedAt"
       FROM units WHERE "propertyId" = $1 ORDER BY "unitNumber" ASC`,
      params.id
    )

    return NextResponse.json({ ...props[0], units });
  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json({ error: "Failed to fetch property" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Auth guard
  const token = request.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN","MANAGER","CARETAKER"].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }


    const data = await request.json();
    
    const updateData: any = {
      updatedAt: new Date()
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state || null;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode || null;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.description !== undefined) updateData.description = data.description || null;
    
    if (data.managerIds !== undefined) {
      updateData.managerIds = Array.isArray(data.managerIds) ? data.managerIds : [];
    }
    if (data.caretakerIds !== undefined) {
      updateData.caretakerIds = Array.isArray(data.caretakerIds) ? data.caretakerIds : [];
    }
    if (data.storekeeperIds !== undefined) {
      updateData.storekeeperIds = Array.isArray(data.storekeeperIds) ? data.storekeeperIds : [];
    }

    const db = getPrismaForRequest(request)
    const keys = Object.keys(updateData)
    const vals = Object.values(updateData)
    const sets = keys.map((k, i) => {
      const cast = Array.isArray(vals[i]) ? '::text[]' : ''
      return `"${k}" = $${i + 2}${cast}`
    }).join(', ')
    await db.$executeRawUnsafe(`UPDATE properties SET ${sets} WHERE id = $1`, params.id, ...vals)
    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM properties WHERE id = $1`, params.id)
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error updating property:", error);
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Auth guard
  const token = request.cookies.get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN","MANAGER","CARETAKER"].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }


    const db = getPrismaForRequest(request)

    const units = await db.$queryRawUnsafe<any[]>(`SELECT id FROM units WHERE "propertyId" = $1`, params.id)
    const unitIds = units.map(u => u.id)
    const tenants = unitIds.length
      ? await db.$queryRawUnsafe<any[]>(`SELECT id FROM tenants WHERE "unitId" = ANY($1::text[])`, unitIds)
      : []
    const tenantIds = tenants.map(t => t.id)

    if (tenantIds.length > 0) {
      await db.$executeRawUnsafe(`DELETE FROM water_readings WHERE "tenantId" = ANY($1::text[])`, tenantIds)
      await db.$executeRawUnsafe(`DELETE FROM vacate_notices WHERE "tenantId" = ANY($1::text[])`, tenantIds)
      await db.$executeRawUnsafe(`DELETE FROM security_deposits WHERE "tenantId" = ANY($1::text[])`, tenantIds)
      await db.$executeRawUnsafe(`DELETE FROM payments WHERE "tenantId" = ANY($1::text[])`, tenantIds)
      await db.$executeRawUnsafe(`DELETE FROM lease_agreements WHERE "tenantId" = ANY($1::text[])`, tenantIds)
      await db.$executeRawUnsafe(`DELETE FROM damage_assessments WHERE "tenantId" = ANY($1::text[])`, tenantIds)
    }
    if (unitIds.length > 0) {
      await db.$executeRawUnsafe(`DELETE FROM maintenance_requests WHERE "unitId" = ANY($1::text[])`, unitIds)
      await db.$executeRawUnsafe(`DELETE FROM tenants WHERE "unitId" = ANY($1::text[])`, unitIds)
      await db.$executeRawUnsafe(`DELETE FROM units WHERE "propertyId" = $1`, params.id)
    }
    await db.$executeRawUnsafe(`DELETE FROM expenses WHERE "propertyId" = $1`, params.id)
    await db.$executeRawUnsafe(`DELETE FROM properties WHERE id = $1`, params.id)

    return NextResponse.json({ message: "Property deleted successfully" });
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json({ 
      error: "Failed to delete property", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
