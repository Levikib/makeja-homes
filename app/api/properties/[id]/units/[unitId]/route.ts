import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { getCurrentUserFromRequest } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string; unitId: string } }) {
  const caller = await getCurrentUserFromRequest(request)
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["ADMIN", "MANAGER", "CARETAKER", "STOREKEEPER", "TECHNICAL"].includes(caller.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const db = getPrismaForRequest(request);
    const units = await db.$queryRawUnsafe<any[]>(`
      SELECT u.*, p.id as "prop_id", p.name as "prop_name"
      FROM units u
      JOIN properties p ON p.id = u."propertyId"
      WHERE u.id = $1 LIMIT 1
    `, params.unitId);

    if (!units.length) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    const u = units[0];

    // Current tenant: active lease exists for this unit
    const currentTenants = await db.$queryRawUnsafe<any[]>(`
      SELECT t.id, t."leaseStartDate", t."leaseEndDate", t."rentAmount", t."depositAmount",
        usr."firstName", usr."lastName", usr.email, usr."phoneNumber",
        la.status as "leaseStatus"
      FROM lease_agreements la
      JOIN tenants t ON t.id = la."tenantId"
      JOIN users usr ON usr.id = t."userId"
      WHERE la."unitId" = $1 AND la.status IN ('ACTIVE', 'PENDING')
      ORDER BY la."createdAt" DESC LIMIT 1
    `, params.unitId);

    // Historical tenants: terminated/expired leases for this unit
    const historicalTenants = await db.$queryRawUnsafe<any[]>(`
      SELECT t.id, t."leaseStartDate", t."leaseEndDate", t."rentAmount", t."depositAmount",
        usr."firstName", usr."lastName", usr.email, usr."phoneNumber",
        la.status as "leaseStatus", la."contractSignedAt", la."updatedAt" as "leaseUpdatedAt"
      FROM lease_agreements la
      JOIN tenants t ON t.id = la."tenantId"
      JOIN users usr ON usr.id = t."userId"
      WHERE la."unitId" = $1 AND la.status IN ('TERMINATED', 'EXPIRED')
      ORDER BY la."createdAt" DESC
    `, params.unitId);

    const mapTenant = (t: any) => ({
      id: t.id, leaseStartDate: t.leaseStartDate, leaseEndDate: t.leaseEndDate,
      rentAmount: t.rentAmount, depositAmount: t.depositAmount, leaseStatus: t.leaseStatus,
      users: { firstName: t.firstName, lastName: t.lastName, email: t.email, phoneNumber: t.phoneNumber },
    });

    return NextResponse.json({
      ...u,
      properties: { id: u.prop_id, name: u.prop_name },
      tenants: currentTenants.map(mapTenant),
      tenantHistory: historicalTenants.map(mapTenant),
    });
  } catch (error) {
    console.error("Error fetching unit:", error);
    return NextResponse.json({ error: "Failed to fetch unit" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string; unitId: string } }) {
  const caller = await getCurrentUserFromRequest(request)
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["ADMIN", "MANAGER"].includes(caller.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const data = await request.json();
    const { updateType, createNewLease, ...unitData } = data;
    const db = getPrismaForRequest(request);
    const today = new Date();

    if (unitData.unitNumber) {
      const dup = await db.$queryRawUnsafe<any[]>(
        `SELECT id FROM units WHERE "propertyId" = $1 AND "unitNumber" = $2 AND id != $3 AND "deletedAt" IS NULL LIMIT 1`,
        params.id, unitData.unitNumber, params.unitId
      );
      if (dup.length) return NextResponse.json({ error: "A unit with this number already exists" }, { status: 400 });
    }

    const activeLease = await db.$queryRawUnsafe<any[]>(`
      SELECT la.*, t.id as "tenantId", t."userId",
        usr."firstName", usr."lastName", usr.email
      FROM lease_agreements la
      JOIN tenants t ON t.id = la."tenantId"
      JOIN users usr ON usr.id = t."userId"
      WHERE la."unitId" = $1 AND la.status = 'ACTIVE' LIMIT 1
    `, params.unitId);

    if (activeLease.length && !updateType) {
      const al = activeLease[0];
      return NextResponse.json({
        hasActiveTenant: true,
        tenant: { name: `${al.firstName} ${al.lastName}`, email: al.email, currentRent: al.rentAmount, currentDeposit: al.depositAmount, leaseEnd: al.endDate },
        lease: { id: al.id, startDate: al.startDate, endDate: al.endDate },
      }, { status: 409 });
    }

    if (updateType === "createLease" && activeLease.length && createNewLease) {
      await db.$executeRawUnsafe(
        `UPDATE units SET "unitNumber"=$2, type=$3::text::"UnitType", status='RESERVED'::text::"UnitStatus", bedrooms=$4, bathrooms=$5, "squareFeet"=$6, floor=$7, "rentAmount"=$8, "depositAmount"=$9, "updatedAt"=$10 WHERE id=$1`,
        params.unitId, unitData.unitNumber, unitData.type, unitData.bedrooms, unitData.bathrooms, unitData.squareFeet, unitData.floor, unitData.rentAmount, unitData.depositAmount, today
      );
      await db.$executeRawUnsafe(
        `UPDATE lease_agreements SET status=$2::text::"LeaseStatus", "endDate"=$3, "updatedAt"=$4 WHERE id=$1`,
        activeLease[0].id, createNewLease.expireImmediately ? 'EXPIRED' : 'ACTIVE',
        createNewLease.expireImmediately ? today : activeLease[0].endDate, today
      );
      const newLeaseId = `lease_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.$executeRawUnsafe(
        `INSERT INTO lease_agreements (id, "tenantId", "unitId", status, "startDate", "endDate", "rentAmount", "depositAmount", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,'PENDING'::text::"LeaseStatus",$4,$5,$6,$7,$8,$8)`,
        newLeaseId, activeLease[0].tenantId, params.unitId,
        new Date(createNewLease.startDate), new Date(createNewLease.endDate),
        unitData.rentAmount, unitData.depositAmount, today
      );
      return NextResponse.json({ success: true, message: "New lease created.", newLeaseCreated: true });
    }

    // Build partial update — only set fields that were provided
    const setClauses: string[] = [`"updatedAt" = $2`];
    const vals: any[] = [params.unitId, today];
    let idx = 3;

    const enumFields: Record<string, string> = { type: '"UnitType"', status: '"UnitStatus"' };
    const plainFields = ['unitNumber', 'bedrooms', 'bathrooms', 'squareFeet', 'floor', 'rentAmount', 'depositAmount'];

    for (const field of plainFields) {
      if (unitData[field] !== undefined) {
        setClauses.push(`"${field}" = $${idx++}`);
        vals.push(unitData[field]);
      }
    }
    for (const [field, enumType] of Object.entries(enumFields)) {
      if (unitData[field] !== undefined) {
        setClauses.push(`"${field}" = $${idx++}::text::${enumType}`);
        vals.push(unitData[field]);
      }
    }

    await db.$executeRawUnsafe(
      `UPDATE units SET ${setClauses.join(', ')} WHERE id = $1`,
      ...vals
    );
    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM units WHERE id = $1`, params.unitId);
    return NextResponse.json({ success: true, unit: rows[0] });
  } catch (error) {
    console.error("Error updating unit:", error);
    return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; unitId: string } }) {
  const caller = await getCurrentUserFromRequest(request)
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const db = getPrismaForRequest(request);
    await db.$executeRawUnsafe(`UPDATE units SET "deletedAt" = NOW() WHERE id = $1`, params.unitId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting unit:", error);
    return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 });
  }
}
