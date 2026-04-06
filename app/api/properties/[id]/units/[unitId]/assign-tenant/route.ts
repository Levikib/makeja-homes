import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { jwtVerify } from "jose";
import { resend, EMAIL_CONFIG } from "@/lib/resend";
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
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'TENANT'::text::"Role", false, $8, $8)`,
        userId, email, hashedPassword, firstName, lastName, phoneNumber || null, idNumber || null, timestamp
      );
    }

    const tenantId = generateUniqueId("tenant");
    await db.$executeRawUnsafe(
      `INSERT INTO tenants (id, "userId", "unitId", "leaseStartDate", "leaseEndDate", "rentAmount", "depositAmount", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      tenantId, userId, params.unitId, startDate, endDate, rentAmount, depositAmount || 0, timestamp
    );

    // Build contract terms
    const fmtDate = (d: Date) => d.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
    const contractTerms = `LEASE AGREEMENT

PROPERTY: ${unit.propertyName}
UNIT: ${unit.unitNumber}
TENANT: ${firstName} ${lastName}

LEASE PERIOD:
Start Date: ${fmtDate(startDate)}
End Date: ${fmtDate(endDate)}

FINANCIAL TERMS:
Monthly Rent: KES ${Number(rentAmount).toLocaleString()}
Security Deposit: KES ${Number(depositAmount || 0).toLocaleString()}

PAYMENT:
Rent is due on the 1st of each month.
Security deposit is due before or on the lease start date.

PROPERTY CONDITION:
The tenant accepts the unit in its current condition upon moving in.

GENERAL CONDITIONS:
1. Tenant shall maintain the unit in good condition.
2. Tenant shall not sublet without written consent.
3. Tenant shall give 30 days notice before vacating.
4. Any damage beyond normal wear and tear will be deducted from the deposit.

By digitally signing this agreement, the tenant confirms they have read, understood, and accept all terms and conditions.`;

    const signatureToken = generateUniqueId("sig").replace('sig_', '');
    const leaseId = generateUniqueId("lease");

    await db.$executeRawUnsafe(
      `INSERT INTO lease_agreements (id, "tenantId", "unitId", "startDate", "endDate", "rentAmount", "depositAmount", status, "contractTerms", "signatureToken", "contractSentAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING'::text::"LeaseStatus", $8, $9, $10, $10, $10)`,
      leaseId, tenantId, params.unitId, startDate, endDate, rentAmount, depositAmount || 0, contractTerms, signatureToken, timestamp
    );

    // Unit → RESERVED (not OCCUPIED — tenant must sign first)
    await db.$executeRawUnsafe(
      `UPDATE units SET status = 'RESERVED'::text::"UnitStatus", "updatedAt" = $2 WHERE id = $1`,
      params.unitId, timestamp
    );

    // Audit log (best-effort)
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
         VALUES ($1, $2, 'TENANT_CREATED', 'tenant', $3, $4::jsonb, $5)`,
        `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        adminId, tenantId,
        JSON.stringify({ tenantName: `${firstName} ${lastName}`, email, propertyName: unit.propertyName, unitNumber: unit.unitNumber, rentAmount, depositAmount: depositAmount || 0 }),
        timestamp
      );
    } catch {}

    // Build sign URL using the actual request host so it works on any subdomain
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const baseUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "https://makejahomes.co.ke");
    const signUrl = `${baseUrl}/sign-lease/${signatureToken}`;
    try {
      await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: email,
        replyTo: EMAIL_CONFIG.replyTo,
        subject: `📋 Your Lease Agreement — ${unit.propertyName}, Unit ${unit.unitNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px;">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:28px;">🏠 Lease Agreement Ready</h1>
              <p style="margin:8px 0 0;opacity:.85;">Please review and sign your lease</p>
            </div>
            <div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
              <p style="font-size:16px;color:#111;">Hello <strong>${firstName}</strong>,</p>
              <p style="color:#374151;line-height:1.6;">Your lease agreement for <strong>${unit.propertyName}</strong>, Unit <strong>${unit.unitNumber}</strong> is ready for your review and digital signature.</p>
              <div style="background:#f3f4f6;border-radius:8px;padding:20px;margin:24px 0;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Property</td><td style="padding:6px 0;font-weight:600;color:#111;text-align:right;">${unit.propertyName}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Unit</td><td style="padding:6px 0;font-weight:600;color:#111;text-align:right;">${unit.unitNumber}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Lease Start</td><td style="padding:6px 0;font-weight:600;color:#111;text-align:right;">${fmtDate(startDate)}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Lease End</td><td style="padding:6px 0;font-weight:600;color:#111;text-align:right;">${fmtDate(endDate)}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Monthly Rent</td><td style="padding:6px 0;font-weight:600;color:#2563eb;text-align:right;">KES ${Number(rentAmount).toLocaleString()}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Security Deposit</td><td style="padding:6px 0;font-weight:600;color:#dc2626;text-align:right;">KES ${Number(depositAmount || 0).toLocaleString()} <span style="font-size:11px;font-weight:400;">(due on signing)</span></td></tr>
                </table>
              </div>
              <div style="text-align:center;margin:32px 0;">
                <a href="${signUrl}" style="display:inline-block;background:#2563eb;color:white;padding:16px 40px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:700;">
                  Review &amp; Sign Lease →
                </a>
              </div>
              <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:0 6px 6px 0;margin-top:20px;">
                <p style="margin:0;font-size:13px;color:#92400e;"><strong>⚠️ Important:</strong> Your unit is reserved for you. To confirm your tenancy and activate your account, please sign the lease using the button above. The security deposit of <strong>KES ${Number(depositAmount || 0).toLocaleString()}</strong> will be due upon signing.</p>
              </div>
              <p style="font-size:12px;color:#9ca3af;margin-top:24px;text-align:center;">If you have questions, reply to this email or contact your property manager.<br/>© ${new Date().getFullYear()} Makeja Homes</p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send e-contract email:", emailErr);
    }

    return NextResponse.json({ tenant: { id: tenantId }, lease: { id: leaseId }, unit }, { status: 201 });
  } catch (error) {
    console.error("Error assigning tenant:", error);
    return NextResponse.json({ error: "Failed to assign tenant" }, { status: 500 });
  }
}
