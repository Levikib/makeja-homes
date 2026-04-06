import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic'

function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let adminId: string;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    if (!["ADMIN", "MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    adminId = payload.id as string;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, email, phoneNumber, idNumber, leaseStartDate, leaseEndDate, rentAmount, depositAmount } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "Missing required tenant fields" }, { status: 400 });
    }
    if (!leaseStartDate || !leaseEndDate || !rentAmount) {
      return NextResponse.json({ error: "Missing required lease fields" }, { status: 400 });
    }

    const startDate = new Date(leaseStartDate);
    const endDate = new Date(leaseEndDate);
    if (endDate <= startDate) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    const units = await db.$queryRawUnsafe<any[]>(
      `SELECT u.*, p.name as "propertyName" FROM units u JOIN properties p ON p.id = u."propertyId" WHERE u.id = $1 LIMIT 1`,
      params.unitId
    );
    if (!units.length) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    const unit = units[0];

    if (unit.status === "OCCUPIED") {
      return NextResponse.json({ error: "Unit is already occupied" }, { status: 400 });
    }

    const timestamp = new Date();

    // Find or create user
    const existingUsers = await db.$queryRawUnsafe<any[]>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`, email
    );
    let userId: string;
    if (existingUsers.length) {
      userId = existingUsers[0].id;
    } else {
      userId = generateUniqueId("user");
      const hashedPassword = await bcrypt.hash("TempPass123!", 10);
      await db.$executeRawUnsafe(
        `INSERT INTO users (id, email, password, "firstName", "lastName", "phoneNumber", "idNumber", role, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'TENANT'::text::"Role", true, $8, $8)`,
        userId, email, hashedPassword, firstName, lastName, phoneNumber || null, idNumber || null, timestamp
      );
    }

    const tenantId = generateUniqueId("tenant");
    await db.$executeRawUnsafe(
      `INSERT INTO tenants (id, "userId", "unitId", "leaseStartDate", "leaseEndDate", "rentAmount", "depositAmount", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      tenantId, userId, params.unitId, startDate, endDate, rentAmount, depositAmount || 0, timestamp
    );

    const leaseId = generateUniqueId("lease");
    await db.$executeRawUnsafe(
      `INSERT INTO lease_agreements (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", "depositAmount", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE'::text::"LeaseStatus", $8, $8)`,
      leaseId, tenantId, params.unitId, startDate, endDate, rentAmount, depositAmount || 0, timestamp
    );

    await db.$executeRawUnsafe(
      `UPDATE units SET status = 'OCCUPIED'::text::"UnitStatus", "updatedAt" = $2 WHERE id = $1`,
      params.unitId, timestamp
    );

    // Audit log (best-effort)
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
         VALUES ($1, $2, 'TENANT_CREATED', 'tenant', $3, $4, $5)`,
        `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        adminId, tenantId,
        JSON.stringify({ tenantName: `${firstName} ${lastName}`, email, propertyName: unit.propertyName, unitNumber: unit.unitNumber, rentAmount, depositAmount: depositAmount || 0 }),
        timestamp
      );
    } catch {}

    return NextResponse.json({ tenant: { id: tenantId }, lease: { id: leaseId }, unit }, { status: 201 });
  } catch (error) {
    console.error("Error assigning tenant:", error);
    return NextResponse.json({ error: "Failed to assign tenant" }, { status: 500 });
  }
}
