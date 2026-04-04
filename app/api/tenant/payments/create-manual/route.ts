import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { resend, EMAIL_CONFIG } from "@/lib/resend";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const body = await request.json();
    const { amount, paymentMethod, billId } = body;

    console.log("📝 Creating manual payment:", { userId, amount, paymentMethod });

    // Get tenant details
    const tenant = await prisma.tenants.findFirst({
      where: { userId },
      include: {
        units: {
          include: {
            properties: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const property = tenant.units.properties;
    const unitNumber = tenant.units.unitNumber;

    // Generate reference
    const reference = `MANUAL-${unitNumber}-${Date.now()}`;

    // Map frontend payment method to database enum
    let dbPaymentMethod: PaymentMethod;
    switch (paymentMethod) {
      case "MPESA_TILL":
      case "MPESA_PAYBILL":
        dbPaymentMethod = "M_PESA";
        break;
      case "BANK_TRANSFER":
        dbPaymentMethod = "BANK_TRANSFER";
        break;
      default:
        dbPaymentMethod = "OTHER";
    }

    // Create payment record
    const payment = await prisma.payments.create({
      data: {
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        tenantId: tenant.id,
        unitId: tenant.unitId,
        amount: amount,
        paymentType: "RENT",
        paymentMethod: dbPaymentMethod, // ✅ NOW USES CORRECT ENUM
        status: "PENDING",
        verificationStatus: "PENDING",
        paymentDate: new Date(),
        referenceNumber: reference,
        notes: `Manual payment (${paymentMethod}) for ${property.name}, Unit ${unitNumber}`,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ Manual payment record created:", payment.id);

    // Send acknowledgment email to tenant
    try {
      const tenantUser = await prisma.users.findUnique({ where: { id: userId } });
      if (tenantUser?.email) {
        await resend.emails.send({
          from: EMAIL_CONFIG.from,
          to: tenantUser.email,
          replyTo: EMAIL_CONFIG.replyTo,
          subject: `📋 Payment Submission Received - KSH ${Number(amount).toLocaleString()}`,
          html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden"><div style="background:linear-gradient(135deg,#3b82f6,#2563eb);padding:30px;text-align:center"><h1 style="color:#fff;margin:0">🏠 Makeja Homes</h1><p style="color:#dbeafe;margin:8px 0 0">Payment Submission Received</p></div><div style="padding:32px"><h2 style="color:#1f2937">Hello ${tenantUser.firstName},</h2><p style="color:#4b5563">We have received your payment submission. It is currently <strong>pending verification</strong> by your property manager.</p><div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #3b82f6"><p style="margin:6px 0;color:#374151"><strong>Amount:</strong> KSH ${Number(amount).toLocaleString()}</p><p style="margin:6px 0;color:#374151"><strong>Reference:</strong> ${reference}</p><p style="margin:6px 0;color:#374151"><strong>Property:</strong> ${property.name}</p><p style="margin:6px 0;color:#374151"><strong>Unit:</strong> ${unitNumber}</p><p style="margin:6px 0;color:#374151"><strong>Method:</strong> ${paymentMethod}</p><p style="margin:6px 0;color:#374151"><strong>Submitted:</strong> ${new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div><p style="color:#6b7280;font-size:14px">Please upload proof of payment in your tenant portal if you haven't already. You will receive another email once your payment is verified.</p></div></div></body></html>`,
        });
      }
    } catch (emailErr) {
      console.error("⚠️ Failed to send payment acknowledgment email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        referenceNumber: reference,
        amount: amount,
        status: payment.status,
        verificationStatus: payment.verificationStatus,
      },
      message: "Payment record created. Please upload proof of payment.",
    });
  } catch (error: any) {
    console.error("❌ Manual payment creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment record" },
      { status: 500 }
    );
  }
}