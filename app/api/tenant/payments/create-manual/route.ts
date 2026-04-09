import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import nodemailer from "nodemailer";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const body = await request.json();
    const { amount, paymentMethod, billId } = body;

    const db = getPrismaForRequest(request);

    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT t.id, t."unitId",
        u.email, u."firstName", u."lastName",
        un."unitNumber",
        p.name AS "propertyName"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t."userId" = $1 LIMIT 1
    `, userId);

    if (!tenantRows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenant = tenantRows[0];

    // Map frontend payment method string → DB enum value
    const methodMap: Record<string, string> = {
      MPESA_TILL: "M_PESA",
      MPESA_PAYBILL: "M_PESA",
      BANK_TRANSFER: "BANK_TRANSFER",
    };
    const dbMethod = methodMap[paymentMethod] ?? "OTHER";

    const reference = `MANUAL-${tenant.unitNumber}-${Date.now()}`;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();

    await db.$executeRawUnsafe(`
      INSERT INTO payments (
        id, "referenceNumber", "tenantId", "unitId", amount,
        "paymentType", "paymentMethod", status, "verificationStatus",
        "paymentDate", "createdById", notes, "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5,
        'RENT'::"PaymentType", $6::text::"PaymentMethod",
        'PENDING'::"PaymentStatus", 'PENDING'::"VerificationStatus",
        $7, $8, $9, $7, $7
      )
    `,
      paymentId, reference, tenant.id, tenant.unitId, amount,
      dbMethod, now, userId,
      `Manual payment (${paymentMethod}) for ${tenant.propertyName}, Unit ${tenant.unitNumber}`
    );

    // Email acknowledgment (non-fatal)
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      });
      await transporter.sendMail({
        from: `"Makeja Homes" <${process.env.SMTP_USER}>`,
        to: tenant.email,
        subject: `Payment Submission Received — KSH ${Number(amount).toLocaleString()}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#3b82f6,#2563eb);padding:28px 32px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:20px">Makeja Homes</h1>
              <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px">Payment Submission Received</p>
            </div>
            <div style="padding:28px 32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
              <p style="color:#374151">Hello ${tenant.firstName},</p>
              <p style="color:#6b7280">We have received your payment submission. It is currently <strong>pending verification</strong> by your property manager.</p>
              <div style="background:#f9fafb;border-left:4px solid #3b82f6;padding:16px 20px;border-radius:4px;margin:20px 0">
                <p style="margin:4px 0;color:#374151"><strong>Amount:</strong> KSH ${Number(amount).toLocaleString()}</p>
                <p style="margin:4px 0;color:#374151"><strong>Reference:</strong> ${reference}</p>
                <p style="margin:4px 0;color:#374151"><strong>Property:</strong> ${tenant.propertyName}</p>
                <p style="margin:4px 0;color:#374151"><strong>Unit:</strong> ${tenant.unitNumber}</p>
                <p style="margin:4px 0;color:#374151"><strong>Method:</strong> ${paymentMethod}</p>
              </div>
              <p style="color:#6b7280;font-size:13px">Please upload proof of payment in your tenant portal. You will receive another email once verified.</p>
            </div>
          </div>`,
      });
    } catch (emailErr) {
      console.error("⚠️ Failed to send payment acknowledgment email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      payment: { id: paymentId, referenceNumber: reference, amount, status: "PENDING", verificationStatus: "PENDING" },
      message: "Payment record created. Please upload proof of payment.",
    });
  } catch (error: any) {
    console.error("❌ Manual payment creation error:", error?.message);
    return NextResponse.json({ error: error.message || "Failed to create payment record" }, { status: 500 });
  }
}
