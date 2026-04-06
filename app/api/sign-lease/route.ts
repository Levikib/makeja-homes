import { NextRequest, NextResponse } from "next/server";
import { buildTenantUrl } from "@/lib/get-prisma";
import { PrismaClient } from "@prisma/client";
import { resend, EMAIL_CONFIG } from "@/lib/resend";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic'

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export async function POST(request: NextRequest) {
  const { leaseId, agreed, tenantSlug } = await request.json();

  if (!agreed) {
    return NextResponse.json({ error: "You must agree to the terms to sign the lease" }, { status: 400 });
  }

  // Tenant is not logged in when signing — resolve schema from body slug
  const slug = (tenantSlug || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const schema = slug ? `tenant_${slug}` : "public";
  const db = new PrismaClient({ datasources: { db: { url: buildTenantUrl(schema) } } });

  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const now = new Date();

    // Fetch lease with tenant/unit/property info
    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT la.id, la."tenantId", la."unitId", la."rentAmount", la."depositAmount",
        la.status, la."contractSignedAt",
        t."userId",
        u."firstName", u."lastName", u.email,
        un."unitNumber",
        p.name as "propertyName"
      FROM lease_agreements la
      JOIN tenants t ON t.id = la."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = la."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE la.id = $1 LIMIT 1
    `, leaseId);

    if (!rows.length) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    const lease = rows[0];

    if (lease.contractSignedAt) {
      return NextResponse.json({ error: "This lease has already been signed" }, { status: 400 });
    }

    const signatureData = JSON.stringify({
      signedAt: now.toISOString(),
      ip,
      userAgent,
      agreed: true,
      method: "DIGITAL_CONSENT",
      timestamp: now.getTime(),
    });

    // 1. Activate lease
    await db.$executeRawUnsafe(
      `UPDATE lease_agreements SET
        status = 'ACTIVE'::text::"LeaseStatus",
        "contractSignedAt" = $2,
        "signerIp" = $3,
        "signerUserAgent" = $4,
        "signatureType" = 'DIGITAL_CONSENT',
        "signatureData" = $5,
        "agreementCheckboxes" = $6::jsonb,
        "updatedAt" = $2
       WHERE id = $1`,
      leaseId, now, ip, userAgent, signatureData,
      JSON.stringify({ termsAgreed: true, agreedAt: now.toISOString() })
    );

    // 2. Unit → OCCUPIED
    await db.$executeRawUnsafe(
      `UPDATE units SET status = 'OCCUPIED'::text::"UnitStatus", "updatedAt" = $2 WHERE id = $1`,
      lease.unitId, now
    );

    // 3. Generate temp password and activate user account
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    await db.$executeRawUnsafe(
      `UPDATE users SET password = $2, "mustChangePassword" = true, "isActive" = true, "updatedAt" = $3 WHERE id = $1`,
      lease.userId, hashedPassword, now
    );

    // 4. Create security deposit record (HELD = outstanding, no paidDate)
    if (lease.depositAmount && Number(lease.depositAmount) > 0) {
      try {
        await db.$executeRawUnsafe(
          `INSERT INTO security_deposits (id, "tenantId", "unitId", amount, status, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, 'HELD'::text::"DepositStatus", $5, $5)`,
          `dep_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
          lease.tenantId, lease.unitId, lease.depositAmount, now
        );
      } catch (e) {
        console.error("Failed to create deposit record:", e);
      }
    }

    // 5. Audit log (best-effort)
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
         VALUES ($1, $2, 'LEASE_SIGNED', 'lease_agreement', $3, $4::jsonb, $5)`,
        `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        lease.userId, leaseId,
        JSON.stringify({ unitId: lease.unitId, unitNumber: lease.unitNumber, propertyName: lease.propertyName, ip }),
        now
      );
    } catch {}

    // 6. Send welcome email with credentials (best-effort)
    const appUrl = "https://makejahomes.co.ke";
    try {
      await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: lease.email,
        replyTo: EMAIL_CONFIG.replyTo,
        subject: `🎉 Welcome to ${lease.propertyName} — Your Account is Active`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px;">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:26px;">🏠 Welcome, ${lease.firstName}!</h1>
              <p style="margin:8px 0 0;opacity:.85;">Your lease is signed and your account is ready</p>
            </div>
            <div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
              <p style="color:#374151;line-height:1.6;">Your lease for <strong>${lease.propertyName}</strong>, Unit <strong>${lease.unitNumber}</strong> has been signed and is now <strong style="color:#16a34a;">ACTIVE</strong>. Your tenant account has been created.</p>

              <div style="background:#f3f4f6;border-radius:8px;padding:20px;margin:24px 0;">
                <p style="margin:0 0 12px;font-weight:700;color:#111;">Your Login Credentials</p>
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Email</td><td style="padding:6px 0;font-weight:600;color:#111;text-align:right;font-family:monospace;">${lease.email}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Temporary Password</td><td style="padding:6px 0;font-weight:600;color:#2563eb;text-align:right;font-family:monospace;">${tempPassword}</td></tr>
                </table>
              </div>

              <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:0 6px 6px 0;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#92400e;"><strong>⚠️ Change your password</strong> on first login. This temporary password expires after use.</p>
              </div>

              ${lease.depositAmount && Number(lease.depositAmount) > 0 ? `
              <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:14px 16px;border-radius:0 6px 6px 0;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#991b1b;"><strong>💰 Security Deposit Due:</strong> KES ${Number(lease.depositAmount).toLocaleString()} — please arrange payment with your property manager.</p>
              </div>
              ` : ''}

              <div style="text-align:center;margin:28px 0;">
                <a href="${appUrl}/auth/login" style="display:inline-block;background:#2563eb;color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;">
                  Login to Your Dashboard →
                </a>
              </div>

              <p style="font-size:13px;color:#6b7280;line-height:1.6;">From your dashboard you can: view and pay bills, submit maintenance requests, track payment history, and download receipts.</p>
              <p style="font-size:12px;color:#9ca3af;margin-top:20px;text-align:center;">Questions? Contact your property manager or reply to this email.<br/>© ${new Date().getFullYear()} Makeja Homes</p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send welcome email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Lease signed successfully!",
      lease: { id: leaseId, status: "ACTIVE", signedAt: now },
    });

  } catch (error: any) {
    console.error("Error signing lease:", error);
    return NextResponse.json({ error: "Failed to sign lease", details: error.message }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}
