import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import nodemailer from "nodemailer";
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
      `UPDATE lease_agreements SET status = 'TERMINATED'::text::"LeaseStatus", "updatedAt" = $2 WHERE id = $1`,
      activeLease.id, now
    );

    // Old unit → VACANT
    await db.$executeRawUnsafe(
      `UPDATE units SET status = 'VACANT'::text::"UnitStatus", "updatedAt" = $2 WHERE id = $1`,
      tenant.unitId, now
    );

    // New unit → RESERVED
    await db.$executeRawUnsafe(
      `UPDATE units SET status = 'RESERVED'::text::"UnitStatus", "updatedAt" = $2 WHERE id = $1`,
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
       VALUES ($1, $2, $3, 'PENDING'::text::"LeaseStatus", $4, $5, $6, $7, $8, $9, $10, $10)`,
      leaseId, tenantId, newUnitId, effectiveDateObj, oneYearLater, newRentAmount, depositAmount ?? 0, contractTerms, signatureToken, now
    );

    // Audit log (best-effort)
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
         VALUES ($1, $2, 'UNIT_TRANSFER', 'tenant', $3, $4::jsonb, $5)`,
        `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        adminId, tenantId,
        JSON.stringify({ fromUnit: tenant.unitNumber, fromProperty: tenant.propertyName, toUnit: newUnit.unitNumber, toProperty: newUnit.propertyName, depositTransferred: keepDeposit, oldRent: activeLease.rentAmount, newRent: newRentAmount, effectiveDate: effectiveDateObj.toISOString(), notes: notes ?? null }),
        now
      );
    } catch {}

    // Send email (best-effort)
    try {
      const swHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
      const swProto = request.headers.get("x-forwarded-proto") || "https";
      const swBase = swHost ? `${swProto}://${swHost}` : (process.env.NEXT_PUBLIC_APP_URL || "https://makejahomes.co.ke");
      const signUrl = `${swBase}/sign-lease/${signatureToken}`;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      });
      await transporter.sendMail({
        from: `"Makeja Homes" <${process.env.SMTP_USER}>`,
        to: tenant.email,
        subject: `Unit Switch Approved — Sign New Lease for ${newUnit.propertyName} Unit ${newUnit.unitNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#8b5cf6,#ec4899);padding:28px 32px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:20px">Makeja Homes</h1>
              <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px">Unit Switch Approved</p>
            </div>
            <div style="padding:28px 32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
              <p style="color:#374151">Hello ${tenant.firstName},</p>
              <p style="color:#6b7280">Your unit switch has been approved. Please sign your new lease agreement to complete the transfer.</p>
              <div style="background:#f9fafb;border-left:4px solid #8b5cf6;padding:16px 20px;border-radius:4px;margin:20px 0">
                <p style="margin:4px 0;color:#374151"><strong>From:</strong> Unit ${tenant.unitNumber} — ${tenant.propertyName}</p>
                <p style="margin:4px 0;color:#374151"><strong>To:</strong> Unit ${newUnit.unitNumber} — ${newUnit.propertyName}</p>
                <p style="margin:4px 0;color:#374151"><strong>Effective:</strong> ${effectiveDateObj.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p style="margin:4px 0;color:#374151"><strong>New Rent:</strong> KES ${newRentAmount.toLocaleString()}/month</p>
              </div>
              <a href="${signUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Sign New Lease</a>
              <p style="color:#9ca3af;font-size:12px;margin-top:20px">If the button doesn't work, copy this link: ${signUrl}</p>
            </div>
          </div>`,
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
