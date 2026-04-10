import { jwtVerify } from "jose"
import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { logActivity } from "@/lib/log-activity";

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const db = getPrismaForRequest(request);

    const unitRows = await db.$queryRawUnsafe<any[]>(`
      SELECT un.id, un."unitNumber", un.type::text AS type, un.status::text AS status,
        un."rentAmount", un."depositAmount", un.bedrooms, un.bathrooms,
        un."squareFeet", un.floor, un."propertyId", un."createdAt", un."updatedAt",
        p.id AS "propId", p.name AS "propName", p.address AS "propAddress",
        p.city, p.state, p."postalCode", p.country
      FROM units un
      JOIN properties p ON p.id = un."propertyId"
      WHERE un.id = $1 LIMIT 1
    `, params.id);

    if (unitRows.length === 0) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }
    const u = unitRows[0];

    // Get tenants for this unit
    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT t.id, t."unitId", t."rentAmount",
        us.id AS "userId", us."firstName", us."lastName", us.email, us."phoneNumber"
      FROM tenants t
      JOIN users us ON us.id = t."userId"
      WHERE t."unitId" = $1
    `, params.id);

    const unit = {
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
      properties: { id: u.propId, name: u.propName, address: u.propAddress, city: u.city, state: u.state, postalCode: u.postalCode, country: u.country },
      tenants: tenantRows.map(t => ({
        id: t.id, unitId: t.unitId, rentAmount: Number(t.rentAmount),
        users: { id: t.userId, firstName: t.firstName, lastName: t.lastName, email: t.email, phoneNumber: t.phoneNumber },
      })),
    };

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error fetching unit:", error);
    return NextResponse.json({ error: "Failed to fetch unit" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const db = getPrismaForRequest(request);

    // Check if unit number already exists for this property (excluding current unit)
    if (data.unitNumber && data.propertyId) {
      const existing = await db.$queryRawUnsafe<any[]>(`
        SELECT id FROM units
        WHERE "propertyId" = $1 AND "unitNumber" = $2 AND id != $3 AND "deletedAt" IS NULL
        LIMIT 1
      `, data.propertyId, data.unitNumber, params.id);

      if (existing.length > 0) {
        return NextResponse.json({ error: "A unit with this number already exists in this property" }, { status: 400 });
      }
    }

    const now = new Date();

    const sets: string[] = [];
    const args: any[] = [];
    let idx = 1;

    if (data.unitNumber !== undefined) { sets.push(`"unitNumber" = $${idx++}`); args.push(data.unitNumber); }
    if (data.type !== undefined) { sets.push(`type = $${idx++}::"UnitType"`); args.push(data.type); }
    if (data.status !== undefined) { sets.push(`status = $${idx++}::"UnitStatus"`); args.push(data.status); }
    if (data.rentAmount !== undefined) { sets.push(`"rentAmount" = $${idx++}`); args.push(data.rentAmount); }
    if (data.depositAmount !== undefined) { sets.push(`"depositAmount" = $${idx++}`); args.push(data.depositAmount); }
    if (data.bedrooms !== undefined) { sets.push(`bedrooms = $${idx++}`); args.push(data.bedrooms); }
    if (data.bathrooms !== undefined) { sets.push(`bathrooms = $${idx++}`); args.push(data.bathrooms); }
    if (data.squareFeet !== undefined) { sets.push(`"squareFeet" = $${idx++}`); args.push(data.squareFeet); }
    if (data.floor !== undefined) { sets.push(`floor = $${idx++}`); args.push(data.floor); }

    sets.push(`"updatedAt" = $${idx++}`);
    args.push(now);
    args.push(params.id);

    await db.$executeRawUnsafe(`
      UPDATE units SET ${sets.join(", ")} WHERE id = $${idx}
    `, ...args);

    // Log status changes specifically — these are meaningful events
    if (data.status) {
      const { payload: up } = await jwtVerify(request.cookies.get('token')!.value, new TextEncoder().encode(process.env.JWT_SECRET!));
      await logActivity(db, {
        userId: up.id as string,
        action: "UNIT_STATUS_CHANGED",
        entityType: "unit",
        entityId: params.id,
        details: { newStatus: data.status, unitNumber: data.unitNumber },
      });
    }

    return NextResponse.json({ id: params.id, ...data, updatedAt: now });
  } catch (error) {
    console.error("Error updating unit:", error);
    return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const db = getPrismaForRequest(request);
    const now = new Date();

    await db.$executeRawUnsafe(`
      UPDATE units SET "deletedAt" = $1, "updatedAt" = $1 WHERE id = $2
    `, now, params.id);

    return NextResponse.json({ message: "Unit deleted successfully" });
  } catch (error) {
    console.error("Error deleting unit:", error);
    return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 });
  }
}
