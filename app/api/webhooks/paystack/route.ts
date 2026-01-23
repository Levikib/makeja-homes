import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

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
      const payment = await prisma.payments.create({
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
      await prisma.monthly_bills.update({
        where: { id: billId },
        data: {
          status: "PAID",
          paidDate: new Date(),
          paymentId: payment.id,
        },
      });

      console.log(`✅ Payment processed: ${reference} for bill ${billId}`);

      // TODO: Send confirmation email to tenant
      // await sendPaymentConfirmationEmail(tenantId, payment);

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
        await prisma.payments.create({
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
