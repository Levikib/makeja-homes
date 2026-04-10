import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { logActivity } from "@/lib/log-activity";

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    if (!["ADMIN", "MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const db = getPrismaForRequest(request);

    // Fetch lease with all needed fields
    const leaseRows = await db.$queryRawUnsafe(`
      SELECT la.id, la."startDate", la."endDate", la."rentAmount", la."depositAmount",
        la."tenantId", la."unitId", la.terms,
        usr."firstName", usr."lastName", usr.email, usr."phoneNumber",
        un."unitNumber",
        p.id as "propertyId", p.name as "propertyName", p.address as "propertyAddress",
        p.city as "propertyCity", p."mpesaPaybillName", p."mpesaPaybillNumber",
        p."mpesaTillNumber", p."contractTemplate"
      FROM lease_agreements la
      JOIN tenants t ON t.id = la."tenantId"
      JOIN users usr ON usr.id = t."userId"
      JOIN units un ON un.id = la."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE la.id = $1 LIMIT 1
    `, params.id) as any[];

    if (!leaseRows.length) return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    const lease = leaseRows[0];

    const fmtDate = (d: any) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
    const fmtAmt = (n: any) => `KSH ${Math.round(Number(n)).toLocaleString()}`;

    // Build contract body — use property template if set, else use default clauses
    let clausesText: string;
    if (lease.contractTemplate) {
      // Property has a custom template — interpolate variables
      clausesText = lease.contractTemplate
        .replace(/\{\{rentAmount\}\}/g, fmtAmt(lease.rentAmount))
        .replace(/\{\{depositAmount\}\}/g, fmtAmt(lease.depositAmount))
        .replace(/\{\{startDate\}\}/g, fmtDate(lease.startDate))
        .replace(/\{\{endDate\}\}/g, fmtDate(lease.endDate))
        .replace(/\{\{tenantName\}\}/g, `${lease.firstName} ${lease.lastName}`)
        .replace(/\{\{unitNumber\}\}/g, lease.unitNumber)
        .replace(/\{\{propertyName\}\}/g, lease.propertyName);
    } else {
      clausesText = `1. RENT PAYMENT: Monthly rent of ${fmtAmt(lease.rentAmount)} is due on or before the 5th day of each calendar month. Late payments attract a penalty as stipulated by management.

2. SECURITY DEPOSIT: The Tenant has paid a refundable security deposit of ${fmtAmt(lease.depositAmount)}. This deposit shall be refunded within 30 days after the Tenant vacates, subject to deductions for damages beyond normal wear and tear.

3. UTILITIES: The Tenant is responsible for payment of water, electricity, garbage collection fees, and any other utility charges applicable to the unit. Water charges are billed monthly based on meter readings.

4. USE OF PREMISES: The Tenant shall use the premises for residential purposes only and shall not sublet, assign, or transfer any interest without written consent from Management.

5. MAINTENANCE: The Tenant shall maintain the unit in a clean and sanitary condition and shall promptly report any damages or maintenance issues to Management. Intentional or negligent damage shall be the financial responsibility of the Tenant.

6. NOTICE TO VACATE: Either party shall provide a minimum of 30 days written notice before the end of the lease period. Failure to provide notice may result in forfeiture of part of the security deposit.

7. PROHIBITED ACTIVITIES: The Tenant shall not engage in any illegal activities on the premises, cause nuisance to other tenants, keep pets without written management approval, or make structural alterations to the unit.

8. INSPECTION: Management reserves the right to inspect the unit with reasonable notice (minimum 24 hours) or immediately in case of emergency.

9. RENEWAL: This lease may be renewed by mutual agreement in writing. Continued occupation after the end date without a new agreement shall constitute a month-to-month tenancy.

10. GOVERNING LAW: This Agreement is governed by the laws of Kenya including the Landlord and Tenant Act (Cap 301) and the Rent Restriction Act (Cap 296).`;
    }

    const contractTerms = `RESIDENTIAL LEASE AGREEMENT
================================

This Lease Agreement is entered into on ${fmtDate(new Date())} between:

LANDLORD / MANAGEMENT: ${lease.propertyName}
Address: ${lease.propertyAddress}, ${lease.propertyCity}${lease.mpesaPaybillNumber ? `\nPaybill: ${lease.mpesaPaybillName || ""} (${lease.mpesaPaybillNumber})` : ""}${lease.mpesaTillNumber ? `\nTill: ${lease.mpesaTillNumber}` : ""}

TENANT: ${lease.firstName} ${lease.lastName}
Email: ${lease.email}
Phone: ${lease.phoneNumber || "N/A"}

PROPERTY: ${lease.propertyName}
Unit: ${lease.unitNumber}
Address: ${lease.propertyAddress}, ${lease.propertyCity}

LEASE PERIOD: ${fmtDate(lease.startDate)} to ${fmtDate(lease.endDate)}
MONTHLY RENT: ${fmtAmt(lease.rentAmount)}
SECURITY DEPOSIT: ${fmtAmt(lease.depositAmount)}

TERMS AND CONDITIONS
--------------------
${clausesText}${lease.terms ? `\n\nSPECIAL CONDITIONS\n------------------\n${lease.terms}` : ""}

By signing this agreement digitally, the Tenant acknowledges having read, understood, and agreed to all terms and conditions stated above.`;

    // Generate signature token and build link
    const signatureToken = crypto.randomBytes(32).toString("hex");
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const baseUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "https://makejahomes.co.ke");
    const tenantSlug = request.headers.get("x-tenant-slug") || "";
    const signatureLink = `${baseUrl}/sign-lease/${signatureToken}${tenantSlug ? `?t=${tenantSlug}` : ""}`;

    // Save token + contractTerms to lease (NOT yet signed — this is the pre-signature copy)
    await db.$executeRawUnsafe(`
      UPDATE lease_agreements SET
        "signatureToken" = $2, "contractTerms" = $3,
        "contractSentAt" = NOW(), "updatedAt" = NOW()
      WHERE id = $1
    `, params.id, signatureToken, contractTerms);

    // Send email
    const htmlEmail = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px; margin:0;">
  <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); padding:30px; text-align:center;">
      <h1 style="color:#fff; margin:0; font-size:28px;">Makeja Homes</h1>
      <p style="color:#e0e7ff; margin:10px 0 0 0; font-size:16px;">Property Management</p>
    </div>
    <div style="padding:40px 30px;">
      <h2 style="color:#1f2937; margin-top:0;">Hello ${lease.firstName}!</h2>
      <p style="color:#4b5563; font-size:16px; line-height:1.6;">Your lease agreement for <strong>${lease.propertyName} — Unit ${lease.unitNumber}</strong> is ready for your review and digital signature.</p>
      <div style="background:#f3f4f6; border-radius:8px; padding:20px; margin:30px 0;">
        <h3 style="color:#1f2937; margin-top:0; border-bottom:2px solid #667eea; padding-bottom:10px;">Lease Summary</h3>
        <div style="margin-bottom:12px;"><span style="color:#6b7280; font-size:14px; display:block;">Property &amp; Unit</span><span style="color:#1f2937; font-size:16px; font-weight:bold;">${lease.propertyName} — Unit ${lease.unitNumber}</span></div>
        <div style="margin-bottom:12px;"><span style="color:#6b7280; font-size:14px; display:block;">Monthly Rent</span><span style="color:#059669; font-size:20px; font-weight:bold;">${fmtAmt(lease.rentAmount)}</span></div>
        <div style="margin-bottom:12px;"><span style="color:#6b7280; font-size:14px; display:block;">Lease Period</span><span style="color:#1f2937; font-size:16px; font-weight:bold;">${fmtDate(lease.startDate)} – ${fmtDate(lease.endDate)}</span></div>
        <div><span style="color:#6b7280; font-size:14px; display:block;">Security Deposit</span><span style="color:#1f2937; font-size:16px; font-weight:bold;">${fmtAmt(lease.depositAmount)}</span></div>
      </div>
      <div style="text-align:center; margin:40px 0;">
        <a href="${signatureLink}" style="display:inline-block; background:#667eea; color:#fff; padding:16px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:16px;">Review &amp; Sign Lease Agreement</a>
      </div>
      <div style="background:#fef3c7; border-left:4px solid #f59e0b; padding:15px; border-radius:4px; margin:30px 0;">
        <p style="margin:0; color:#92400e; font-size:14px;"><strong>Important:</strong> This link is unique to you. Please do not share it.</p>
      </div>
      <p style="color:#6b7280; font-size:14px; line-height:1.6;">Questions? Contact us at support@makejahomes.co.ke</p>
    </div>
    <div style="background:#f9fafb; padding:20px 30px; border-top:1px solid #e5e7eb; text-align:center;">
      <p style="color:#6b7280; font-size:12px; margin:0;">© ${new Date().getFullYear()} Makeja Homes. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    await transporter.sendMail({
      from: `"Makeja Homes" <${process.env.SMTP_USER}>`,
      to: lease.email,
      subject: `Your Lease Agreement — ${lease.propertyName}, Unit ${lease.unitNumber}`,
      html: htmlEmail,
    });

    const { payload: adminPayload } = await jwtVerify(token!, new TextEncoder().encode(process.env.JWT_SECRET!));
    await logActivity(db, {
      userId: adminPayload.id as string,
      action: "LEASE_CONTRACT_SENT",
      entityType: "lease_agreement",
      entityId: params.id,
      details: { tenant: `${lease.firstName} ${lease.lastName}`, email: lease.email, property: lease.propertyName, unit: lease.unitNumber },
    });

    return NextResponse.json({
      success: true,
      message: "Contract sent successfully",
      emailId: null,
      recipientEmail: lease.email,
    });
  } catch (error: any) {
    console.error("send-contract error:", error?.message);
    return NextResponse.json({ error: "Failed to send contract" }, { status: 500 });
  }
}
