import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest, resolveSchema } from "@/lib/get-prisma";
import { resend, EMAIL_CONFIG } from "@/lib/resend";
import { sanitizeOptional, sanitizeAmount } from "@/lib/sanitize";

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    if (!["ADMIN", "MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getPrismaForRequest(request);

    const tenants = await db.$queryRawUnsafe<any[]>(`
      SELECT t.id, t."unitId", t."rentAmount",
        u."firstName", u."lastName", u.email,
        un."unitNumber", un."rentAmount" as "unitRent",
        p.id as "propertyId", p.name as "propertyName"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t.id = $1 LIMIT 1
    `, params.id);
    if (!tenants.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenant = tenants[0];

    const leases = await db.$queryRawUnsafe<any[]>(`
      SELECT id, "startDate", "endDate", "rentAmount", "depositAmount"
      FROM lease_agreements WHERE "tenantId" = $1 AND status = 'ACTIVE'
      ORDER BY "createdAt" DESC LIMIT 1
    `, params.id);
    const activeLease = leases[0] || null;

    const vacantUnits = await db.$queryRawUnsafe<any[]>(`
      SELECT u.id, u."unitNumber", u."propertyId", u."rentAmount", u."depositAmount", u.bedrooms, u.type,
        p.name as "propertyName"
      FROM units u JOIN properties p ON p.id = u."propertyId"
      WHERE u.status = 'VACANT' AND u."deletedAt" IS NULL AND u.id != $1
      ORDER BY p.name ASC, u."unitNumber" ASC
    `, tenant.unitId);

    return NextResponse.json({
      tenant: { id: tenant.id, name: `${tenant.firstName} ${tenant.lastName}`, email: tenant.email },
      currentUnit: { id: tenant.unitId, unitNumber: tenant.unitNumber, propertyName: tenant.propertyName, rentAmount: activeLease?.rentAmount ?? tenant.rentAmount },
      currentLease: activeLease ? { id: activeLease.id, endDate: activeLease.endDate, depositAmount: activeLease.depositAmount } : null,
      vacantUnits: vacantUnits.map(u => ({ id: u.id, unitNumber: u.unitNumber, propertyId: u.propertyId, propertyName: u.propertyName, rentAmount: u.rentAmount, depositAmount: u.depositAmount, bedrooms: u.bedrooms, type: u.type })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to load transfer data" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const newUnitId = sanitizeOptional(body.newUnitId, 100);
    const keepDeposit: boolean = body.keepDeposit !== false;
    const effectiveDate = sanitizeOptional(body.effectiveDate, 20);
    const rentOverride = body.rentOverride != null ? sanitizeAmount(body.rentOverride, "rentOverride") : undefined;
    const notes = sanitizeOptional(body.notes, 500);
    const tenantId = params.id;

    if (!newUnitId) return NextResponse.json({ error: "New unit ID is required" }, { status: 400 });

    const db = getPrismaForRequest(request);
    const schema = resolveSchema(request);
    const now = new Date();

    // Get tenant
    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT t.id, t."unitId", t."rentAmount",
        u.id as "userId", u."firstName", u."lastName", u.email,
        un."unitNumber", p.name as "propertyName"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t.id = $1 LIMIT 1
    `, tenantId);
    if (!tenantRows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenant = tenantRows[0];

    // Get active lease
    const leases = await db.$queryRawUnsafe<any[]>(`
      SELECT id, "rentAmount", "depositAmount", "endDate"
      FROM lease_agreements WHERE "tenantId" = $1 AND status = 'ACTIVE'
      ORDER BY "createdAt" DESC LIMIT 1
    `, tenantId);
    if (!leases.length) return NextResponse.json({ error: "No active lease found for tenant" }, { status: 400 });
    const activeLease = leases[0];

    // Get new unit
    const newUnitRows = await db.$queryRawUnsafe<any[]>(`
      SELECT u.*, p.name as "propertyName" FROM units u JOIN properties p ON p.id = u."propertyId"
      WHERE u.id = $1 LIMIT 1
    `, newUnitId);
    if (!newUnitRows.length) return NextResponse.json({ error: "New unit not found" }, { status: 404 });
    const newUnit = newUnitRows[0];
    if (newUnit.status !== "VACANT") return NextResponse.json({ error: "Selected unit is not vacant" }, { status: 400 });

    // Terminate current lease
    await db.$executeRawUnsafe(
      `UPDATE lease_agreements SET status = 'TERMINATED'::${schema}."LeaseStatus", "updatedAt" = $2 WHERE id = $1`,
      activeLease.id, now
    );

    // Old unit → VACANT
    await db.$executeRawUnsafe(
      `UPDATE units SET status = 'VACANT'::${schema}."UnitStatus", "updatedAt" = $2 WHERE id = $1`,
      tenant.unitId, now
    );

    // New unit → RESERVED
    await db.$executeRawUnsafe(
      `UPDATE units SET status = 'RESERVED'::${schema}."UnitStatus", "updatedAt" = $2 WHERE id = $1`,
      newUnitId, now
    );

    // Update tenant's unitId
    await db.$executeRawUnsafe(
      `UPDATE tenants SET "unitId" = $2, "updatedAt" = $3 WHERE id = $1`,
      tenantId, newUnitId, now
    );

    const depositAmount = keepDeposit ? activeLease.depositAmount : newUnit.depositAmount;
    const effectiveDateObj = effectiveDate ? new Date(effectiveDate) : now;
    const oneYearLater = new Date(effectiveDateObj);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const newRentAmount = rentOverride ? Number(rentOverride) : newUnit.rentAmount;

    const leaseId = `lease_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const signatureToken = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const fmtDate = (d: Date) => d.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
    const contractTerms = `UNIT TRANSFER LEASE AGREEMENT

PROPERTY: ${newUnit.propertyName}
UNIT: ${newUnit.unitNumber}
TENANT: ${tenant.firstName} ${tenant.lastName}

This agreement supersedes the previous lease for Unit ${tenant.unitNumber} at ${tenant.propertyName}.

LEASE PERIOD:
Effective Date: ${fmtDate(effectiveDateObj)}
End Date: ${fmtDate(oneYearLater)}

FINANCIAL TERMS:
Monthly Rent: KES ${newRentAmount.toLocaleString()}
Security Deposit: KES ${(depositAmount ?? 0).toLocaleString()}
${keepDeposit ? "Security deposit transferred from previous unit." : "New deposit required."}
${notes ? `\nTransfer Notes: ${notes}` : ""}

PAYMENT:
Rent is due on the 1st of each month.

PROPERTY CONDITION:
The tenant accepts the unit in its current condition upon transfer.

By digitally signing this agreement, the tenant confirms understanding and acceptance of all terms.`;

    await db.$executeRawUnsafe(
      `INSERT INTO lease_agreements (id, "tenantId", "unitId", status, "startDate", "endDate", "rentAmount", "depositAmount", "contractTerms", "signatureToken", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'PENDING'::${schema}."LeaseStatus", $4, $5, $6, $7, $8, $9, $10, $10)`,
      leaseId, tenantId, newUnitId, effectiveDateObj, oneYearLater, newRentAmount, depositAmount ?? 0, contractTerms, signatureToken, now
    );

    // Audit log (best-effort)
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
         VALUES ($1, $2, 'UNIT_TRANSFER', 'tenant', $3, $4, $5)`,
        `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        adminId, tenantId,
        JSON.stringify({ fromUnit: tenant.unitNumber, fromProperty: tenant.propertyName, toUnit: newUnit.unitNumber, toProperty: newUnit.propertyName, depositTransferred: keepDeposit, oldRent: activeLease.rentAmount, newRent: newRentAmount, effectiveDate: effectiveDateObj.toISOString(), notes: notes ?? null }),
        now
      );
    } catch {}

    // Send email (best-effort)
    try {
      const signUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sign-lease/${signatureToken}`;
      await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: tenant.email,
        replyTo: EMAIL_CONFIG.replyTo,
        subject: `🏠 Unit Switch Approved - Sign New Lease for ${newUnit.propertyName} Unit ${newUnit.unitNumber}`,
        html: `<p>Hello ${tenant.firstName}! Your unit switch has been approved. <a href="${signUrl}">Sign your new lease here</a>.</p>`,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Unit switch completed successfully",
      data: { oldUnit: tenant.unitNumber, newUnit: newUnit.unitNumber, newLeaseId: leaseId },
    });
  } catch (error: any) {
    console.error("Unit switch error:", error);
    return NextResponse.json({ error: error.message || "Failed to switch unit" }, { status: 500 });
  }
}
