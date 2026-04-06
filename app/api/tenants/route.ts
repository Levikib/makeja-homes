import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
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
        un."unitNumber", un."propertyId", un.status as "unitStatus",
        p.id as "property_id", p.name as "property_name"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE u."isActive" = true
      ORDER BY t."createdAt" DESC
    `)

    // Fetch leases and vacate notices for all tenants in one query each
    const tenantIds = tenants.map(t => t.id);

    const leases = tenantIds.length ? await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, "tenantId", status, "startDate", "endDate", "rentAmount", "depositAmount"
       FROM lease_agreements WHERE "tenantId" = ANY($1::text[]) ORDER BY "createdAt" DESC`,
      tenantIds
    ) : [];

    const vacateNotices = tenantIds.length ? await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, "tenantId", "noticeDate", "intendedVacateDate", "actualVacateDate", status
       FROM vacate_notices WHERE "tenantId" = ANY($1::text[]) ORDER BY "noticeDate" DESC`,
      tenantIds
    ).catch(() => [] as any[]) : [];

    const leasesByTenant = leases.reduce((acc: any, l: any) => {
      if (!acc[l.tenantId]) acc[l.tenantId] = [];
      acc[l.tenantId].push(l);
      return acc;
    }, {});

    const vacateByTenant = (vacateNotices as any[]).reduce((acc: any, v: any) => {
      if (!acc[v.tenantId]) acc[v.tenantId] = [];
      acc[v.tenantId].push(v);
      return acc;
    }, {});

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
        status: row.unitStatus,
        properties: {
          id: row.property_id,
          name: row.property_name,
        },
      },
      lease_agreements: leasesByTenant[row.id] ?? [],
      vacate_notices: vacateByTenant[row.id] ?? [],
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

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN", "MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { firstName, lastName, email, phoneNumber, idNumber, unitId, rentAmount, depositAmount, leaseStartDate, leaseEndDate } = body

    if (!firstName || !lastName || !email || !unitId || !leaseStartDate || !leaseEndDate || !rentAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const startDate = new Date(leaseStartDate)
    const endDate = new Date(leaseEndDate)
    if (endDate <= startDate) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
    }

    const prisma = getPrismaForRequest(request)
    const ts = new Date()

    // Check unit exists and is vacant
    const units = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, "unitNumber", status, "propertyId" FROM units WHERE id = $1 LIMIT 1`, unitId
    )
    if (!units.length) return NextResponse.json({ error: "Unit not found" }, { status: 404 })
    if (units[0].status === "OCCUPIED") return NextResponse.json({ error: "Unit is already occupied" }, { status: 400 })

    // Find or create user
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`, email.toLowerCase().trim()
    )
    let userId: string
    if (existing.length) {
      userId = existing[0].id
    } else {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const hashed = await bcrypt.hash("TempPass123!", 10)
      await prisma.$executeRawUnsafe(
        `INSERT INTO users (id, email, password, "firstName", "lastName", "phoneNumber", "idNumber", role, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'TENANT'::text::"Role", true, $8, $8)`,
        userId, email.toLowerCase().trim(), hashed, firstName, lastName, phoneNumber || null, idNumber || null, ts
      )
    }

    // Create tenant record
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await prisma.$executeRawUnsafe(
      `INSERT INTO tenants (id, "userId", "unitId", "leaseStartDate", "leaseEndDate", "rentAmount", "depositAmount", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      tenantId, userId, unitId, startDate, endDate, rentAmount, depositAmount || 0, ts
    )

    // Create lease agreement
    const leaseId = `lease_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await prisma.$executeRawUnsafe(
      `INSERT INTO lease_agreements (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", "depositAmount", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE'::text::"LeaseStatus", $8, $8)`,
      leaseId, tenantId, unitId, startDate, endDate, rentAmount, depositAmount || 0, ts
    )

    // Mark unit as OCCUPIED
    await prisma.$executeRawUnsafe(
      `UPDATE units SET status = 'OCCUPIED'::text::"UnitStatus", "updatedAt" = $1 WHERE id = $2`, ts, unitId
    )

    return NextResponse.json({ success: true, tenantId }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating tenant:", error)
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 })
  }
}
