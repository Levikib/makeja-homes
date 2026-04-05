import { NextRequest, NextResponse } from "next/server";
import { getPrismaForTenant } from "@/lib/prisma";
import crypto from "crypto";
import { resend, EMAIL_CONFIG } from "@/lib/resend";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get("x-paystack-signature");
    const body = await request.text();
    
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.error("❌ Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Handle successful payment
    if (event.event === "charge.success") {
      const { reference, amount, customer, metadata } = event.data;

      // Extract metadata
      const billId = metadata?.billId;
      const tenantId = metadata?.tenantId;
      const unitId = metadata?.unitId;

      if (!billId || !tenantId || !unitId) {
        console.error("❌ Missing required metadata in webhook");
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
      }

      // Create payment record
      const payment = await getPrismaForTenant(request).payments.create({
        data: {
          id: `payment_${Date.now()}_${tenantId}`,
          referenceNumber: reference,
          tenantId: tenantId,
          unitId: unitId,
          amount: amount / 100, // Paystack sends amount in kobo
          paymentType: "RENT",
          paymentMethod: "PAYSTACK",
          status: "COMPLETED",
          verificationStatus: "APPROVED", // Auto-approved for Paystack
          paystackReference: reference,
          paystackStatus: "success",
          paystackData: JSON.stringify(event.data),
          paymentDate: new Date(),
          createdById: tenantId, // Tenant initiated
        },
      });

      // Update bill status
      await getPrismaForTenant(request).monthly_bills.update({
        where: { id: billId },
        data: {
          status: "PAID",
          paidDate: new Date(),
          paymentId: payment.id,
        },
      });

      console.log(`✅ Payment processed: ${reference} for bill ${billId}`);

      // Send confirmation email to tenant
      try {
        const tenant = await getPrismaForTenant(request).tenants.findUnique({
          where: { id: tenantId },
          include: { users: true, units: { include: { properties: true } } },
        });
        if (tenant?.users?.email) {
          await resend.emails.send({
            from: EMAIL_CONFIG.from,
            to: tenant.users.email,
            replyTo: EMAIL_CONFIG.replyTo,
            subject: `✅ Payment Confirmed - KSH ${(amount / 100).toLocaleString()}`,
            html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden"><div style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center"><h1 style="color:#fff;margin:0">🏠 Makeja Homes</h1><p style="color:#d1fae5;margin:8px 0 0">Payment Confirmed</p></div><div style="padding:32px"><h2 style="color:#1f2937">Payment Received, ${tenant.users.firstName}!</h2><p style="color:#4b5563">Your payment has been successfully processed.</p><div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #10b981"><p style="margin:6px 0;color:#374151"><strong>Amount:</strong> KSH ${(amount / 100).toLocaleString()}</p><p style="margin:6px 0;color:#374151"><strong>Reference:</strong> ${reference}</p><p style="margin:6px 0;color:#374151"><strong>Property:</strong> ${tenant.units?.properties?.name || ''}</p><p style="margin:6px 0;color:#374151"><strong>Unit:</strong> ${tenant.units?.unitNumber || ''}</p><p style="margin:6px 0;color:#374151"><strong>Date:</strong> ${new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div><p style="color:#6b7280;font-size:14px">Thank you for your payment. Please keep this email as your receipt.</p></div></div></body></html>`,
          });
        }
      } catch (emailErr) {
        console.error("⚠️ Failed to send payment confirmation email:", emailErr);
      }

      return NextResponse.json({
        success: true,
        message: "Payment processed successfully" 
      });
    }

    // Handle failed payment
    if (event.event === "charge.failed") {
      const { reference, metadata } = event.data;
      console.error(`❌ Payment failed: ${reference}`);
      
      // Create failed payment record for tracking
      if (metadata?.tenantId && metadata?.unitId) {
        await getPrismaForTenant(request).payments.create({
          data: {
            id: `payment_failed_${Date.now()}_${metadata.tenantId}`,
            referenceNumber: reference,
            tenantId: metadata.tenantId,
            unitId: metadata.unitId,
            amount: event.data.amount / 100,
            paymentType: "RENT",
            paymentMethod: "PAYSTACK",
            status: "FAILED",
            verificationStatus: "DECLINED",
            paystackReference: reference,
            paystackStatus: "failed",
            paystackData: JSON.stringify(event.data),
            paymentDate: new Date(),
            createdById: metadata.tenantId,
          },
        });
      }

      return NextResponse.json({ 
        success: true,
        message: "Failed payment recorded" 
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
