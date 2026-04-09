import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import nodemailer from "nodemailer";

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (!["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { paymentId, verificationStatus, verificationNotes } = body;

    if (!paymentId || !verificationStatus) {
      return NextResponse.json({ error: "Payment ID and verification status required" }, { status: 400 });
    }
    if (!["APPROVED", "DECLINED"].includes(verificationStatus)) {
      return NextResponse.json({ error: "Invalid verification status" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);
    const now = new Date();
    const newStatus = verificationStatus === "APPROVED" ? "COMPLETED" : "FAILED";

    // Fetch payment + tenant details
    const payRows = await db.$queryRawUnsafe<any[]>(`
      SELECT
        p.id, p."referenceNumber", p.amount, p."paymentType"::text AS "paymentType",
        p."tenantId", p."leaseId",
        u."firstName", u."lastName", u.email,
        un."unitNumber", prop.name AS "propertyName"
      FROM payments p
      JOIN tenants t ON t.id = p."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties prop ON prop.id = un."propertyId"
      WHERE p.id = $1 LIMIT 1
    `, paymentId);

    if (!payRows.length) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    const pay = payRows[0];

    // Update payment
    await db.$executeRawUnsafe(`
      UPDATE payments SET
        "verificationStatus" = $1::text::"VerificationStatus",
        "verificationNotes"  = $2,
        "verifiedById"       = $3,
        "verifiedAt"         = $4,
        status               = $5::text::"PaymentStatus",
        "updatedAt"          = $4
      WHERE id = $6
    `, verificationStatus, verificationNotes || null, userId, now, newStatus, paymentId);

    // If approved: mark pending bill as PAID
    if (verificationStatus === "APPROVED") {
      const billRows = await db.$queryRawUnsafe<any[]>(`
        SELECT id FROM monthly_bills
        WHERE "tenantId" = $1 AND status::text IN ('PENDING', 'OVERDUE')
        ORDER BY month ASC LIMIT 1
      `, pay.tenantId);

      if (billRows.length) {
        await db.$executeRawUnsafe(`
          UPDATE monthly_bills SET
            status = 'PAID'::text::"BillStatus",
            "paidDate" = $2,
            "paymentId" = $3,
            "updatedAt" = $2
          WHERE id = $1
        `, billRows[0].id, now, paymentId);
      }

      // If DEPOSIT: upsert security_deposits
      if (pay.paymentType === "DEPOSIT") {
        await db.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS security_deposits (
            id TEXT PRIMARY KEY,
            "tenantId" TEXT NOT NULL,
            amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'PENDING',
            "paidDate" TIMESTAMP,
            "refundDate" TIMESTAMP,
            "refundAmount" DOUBLE PRECISION,
            "deductionsTotal" DOUBLE PRECISION DEFAULT 0,
            "refundMethod" TEXT,
            "refundNotes" TEXT,
            "createdAt" TIMESTAMP DEFAULT NOW(),
            "updatedAt" TIMESTAMP DEFAULT NOW()
          )
        `).catch(() => {});

        const existing = await db.$queryRawUnsafe<any[]>(
          `SELECT id FROM security_deposits WHERE "tenantId" = $1 LIMIT 1`, pay.tenantId
        );
        if (existing.length) {
          await db.$executeRawUnsafe(`
            UPDATE security_deposits SET status = 'HELD', amount = $1, "paidDate" = $2, "updatedAt" = $2
            WHERE "tenantId" = $3
          `, Number(pay.amount), now, pay.tenantId);
        } else {
          const depId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await db.$executeRawUnsafe(`
            INSERT INTO security_deposits (id, "tenantId", amount, status, "paidDate")
            VALUES ($1, $2, $3, 'HELD', $4)
          `, depId, pay.tenantId, Number(pay.amount), now);
        }
      }
    }

    // Email notification (non-fatal)
    try {
      if (pay.email) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
        });
        const isApproved = verificationStatus === "APPROVED";
        await transporter.sendMail({
          from: `"Makeja Homes" <${process.env.SMTP_USER}>`,
          to: pay.email,
          subject: isApproved
            ? `Payment Verified — KSH ${Number(pay.amount).toLocaleString()}`
            : `Payment Not Verified — Action Required`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:linear-gradient(135deg,${isApproved ? '#10b981,#059669' : '#ef4444,#dc2626'});padding:28px 32px;border-radius:8px 8px 0 0">
                <h1 style="color:#fff;margin:0;font-size:20px">Makeja Homes</h1>
                <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px">Payment ${isApproved ? 'Verified' : 'Not Verified'}</p>
              </div>
              <div style="padding:28px 32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
                <p style="color:#374151">Hello ${pay.firstName},</p>
                <p style="color:#6b7280">${isApproved ? 'Your payment has been verified and approved.' : 'Your payment could not be verified. Please contact your property manager.'}</p>
                <div style="background:#f9fafb;border-left:4px solid ${isApproved ? '#10b981' : '#ef4444'};padding:16px 20px;border-radius:4px;margin:20px 0">
                  <p style="margin:4px 0;color:#374151"><strong>Reference:</strong> ${pay.referenceNumber}</p>
                  <p style="margin:4px 0;color:#374151"><strong>Amount:</strong> KSH ${Number(pay.amount).toLocaleString()}</p>
                  <p style="margin:4px 0;color:#374151"><strong>Unit:</strong> ${pay.unitNumber} — ${pay.propertyName}</p>
                  <p style="margin:4px 0;color:#374151"><strong>Status:</strong> ${verificationStatus}</p>
                  ${verificationNotes ? `<p style="margin:4px 0;color:#374151"><strong>Notes:</strong> ${verificationNotes}</p>` : ''}
                </div>
              </div>
            </div>`,
        });
      }
    } catch (emailErr) {
      console.error("⚠️ Failed to send verification email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Payment ${verificationStatus.toLowerCase()} successfully`,
    });
  } catch (error: any) {
    console.error("❌ Error verifying payment:", error?.message);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
