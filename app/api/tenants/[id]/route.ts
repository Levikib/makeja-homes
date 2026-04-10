import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

async function authGuard(request: NextRequest, roles = ["ADMIN", "MANAGER", "CARETAKER"]) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    if (!roles.includes(payload.role as string)) return null;
    return payload;
  } catch { return null; }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const payload = await authGuard(request);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getPrismaForRequest(request);
    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT t.*, u."firstName", u."lastName", u.email, u."phoneNumber", u."idNumber", u."isActive",
        un.id as "unitId", un."unitNumber", un.status as "unitStatus", un."rentAmount" as "unitRent",
        p.id as "propertyId", p.name as "propertyName"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t.id = $1 LIMIT 1
    `, params.id);

    if (!rows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const t = rows[0];

    const leases = await db.$queryRawUnsafe<any[]>(`
      SELECT id, status, "startDate", "endDate", "rentAmount", "depositAmount"
      FROM lease_agreements WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT 1
    `, params.id);

    return NextResponse.json({
      id: t.id, userId: t.userId, unitId: t.unitId,
      leaseStartDate: t.leaseStartDate, leaseEndDate: t.leaseEndDate,
      rentAmount: t.rentAmount, depositAmount: t.depositAmount,
      createdAt: t.createdAt, updatedAt: t.updatedAt,
      users: { firstName: t.firstName, lastName: t.lastName, email: t.email, phoneNumber: t.phoneNumber, idNumber: t.idNumber, isActive: t.isActive },
      units: { id: t.unitId, unitNumber: t.unitNumber, status: t.unitStatus, rentAmount: t.unitRent, properties: { id: t.propertyId, name: t.propertyName } },
      lease_agreements: leases,
    });
  } catch (error) {
    console.error("Failed to fetch tenant:", error);
    return NextResponse.json({ error: "Failed to fetch tenant" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const payload = await authGuard(request);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await request.json();
    const db = getPrismaForRequest(request);

    const tenants = await db.$queryRawUnsafe<any[]>(
      `SELECT "userId" FROM tenants WHERE id = $1 LIMIT 1`, params.id
    );
    if (!tenants.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const now = new Date();
    await db.$executeRawUnsafe(
      `UPDATE users SET "firstName"=$2, "lastName"=$3, email=$4, "phoneNumber"=$5, "idNumber"=$6, "updatedAt"=$7 WHERE id=$1`,
      tenants[0].userId, data.firstName, data.lastName, data.email, data.phoneNumber || null, data.idNumber || null, now
    );

    // Re-fetch updated tenant
    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT t.*, u."firstName", u."lastName", u.email, u."phoneNumber", u."idNumber", u."isActive",
        un.id as "unitId", un."unitNumber", un.status as "unitStatus",
        p.id as "propertyId", p.name as "propertyName"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t.id = $1 LIMIT 1
    `, params.id);
    const t = rows[0];

    const leases = await db.$queryRawUnsafe<any[]>(`
      SELECT id, status, "startDate", "endDate", "rentAmount", "depositAmount"
      FROM lease_agreements WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT 1
    `, params.id);

    return NextResponse.json({
      id: t.id, userId: t.userId, unitId: t.unitId,
      leaseStartDate: t.leaseStartDate, leaseEndDate: t.leaseEndDate,
      rentAmount: t.rentAmount, depositAmount: t.depositAmount,
      users: { firstName: t.firstName, lastName: t.lastName, email: t.email, phoneNumber: t.phoneNumber, idNumber: t.idNumber, isActive: t.isActive },
      units: { id: t.unitId, unitNumber: t.unitNumber, status: t.unitStatus, properties: { id: t.propertyId, name: t.propertyName } },
      lease_agreements: leases,
    });
  } catch (error: any) {
    console.error("Failed to update tenant:", error);
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const payload = await authGuard(request, ["ADMIN", "MANAGER"]);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getPrismaForRequest(request);
    const now = new Date();

    const tenants = await db.$queryRawUnsafe<any[]>(
      `SELECT t.id, t."userId", t."unitId" FROM tenants t WHERE t.id = $1 LIMIT 1`, params.id
    );
    if (!tenants.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const { userId, unitId } = tenants[0];

    // Terminate all active/pending leases (preserve for history — do NOT delete)
    await db.$executeRawUnsafe(
      `UPDATE lease_agreements SET status = 'TERMINATED'::text::"LeaseStatus", "updatedAt" = $2
       WHERE "tenantId" = $1 AND status IN ('ACTIVE','PENDING')`,
      params.id, now
    );

    // Reset unit to VACANT
    if (unitId) {
      await db.$executeRawUnsafe(
        `UPDATE units SET status = 'VACANT'::text::"UnitStatus", "updatedAt" = $2 WHERE id = $1`,
        unitId, now
      );
    }

    // Deactivate the user account (preserve user row for audit history)
    await db.$executeRawUnsafe(
      `UPDATE users SET "isActive" = false, "updatedAt" = $2 WHERE id = $1`,
      userId, now
    );

    // Delete the tenant record last
    await db.$executeRawUnsafe(`DELETE FROM tenants WHERE id = $1`, params.id);

    return NextResponse.json({ message: "Tenant removed successfully. Unit is now vacant." });
  } catch (error: any) {
    console.error("Failed to delete tenant:", error);
    return NextResponse.json({ error: "Failed to delete tenant" }, { status: 500 });
  }
}
