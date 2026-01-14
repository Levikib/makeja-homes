import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    console.log("📱 Paystack webhook received");

    // Verify webhook signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.error("❌ Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log("📱 Event type:", event.event);

    // Handle successful charge
    if (event.event === "charge.success") {
      const { reference, amount, paid_at, channel, customer } = event.data;

      console.log("✅ Payment successful:", {
        reference,
        amount: amount / 100,
        channel,
      });

      // Find payment by reference
      const payment = await prisma.payments.findFirst({
        where: { referenceNumber: reference },
      });

      if (!payment) {
        console.error("❌ Payment not found:", reference);
        return NextResponse.json({ message: "Payment not found" });
      }

      // Update payment to COMPLETED and AUTO-APPROVE (Paystack already verified)
      await prisma.payments.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          verificationStatus: "APPROVED", // ✅ AUTO-APPROVE PAYSTACK PAYMENTS
          verifiedAt: new Date(paid_at), // ✅ SET VERIFICATION TIME
          transactionId: event.data.id,
          paystackReference: reference,
          paystackStatus: "success",
          paystackData: JSON.stringify(event.data),
          notes: `${payment.notes} | Channel: ${channel} | Customer: ${customer.email} | Auto-verified via Paystack`,
          updatedAt: new Date(),
        },
      });

      console.log("✅ Payment updated to COMPLETED and AUTO-APPROVED");

      // Find and update the bill
      const bill = await prisma.monthly_bills.findFirst({
        where: {
          tenantId: payment.tenantId,
          status: "UNPAID",
        },
        orderBy: { month: "desc" },
      });

      if (bill) {
        await prisma.monthly_bills.update({
          where: { id: bill.id },
          data: {
            status: "PAID",
            paidDate: new Date(paid_at),
            paymentId: payment.id,
            updatedAt: new Date(),
          },
        });
        console.log("✅ Bill marked as PAID:", bill.id);
      }

      console.log("✅ Webhook processed successfully");
    }

    // Handle failed payment
    if (event.event === "charge.failed") {
      const { reference } = event.data;

      console.log("❌ Payment failed:", reference);

      const payment = await prisma.payments.findFirst({
        where: { referenceNumber: reference },
      });

      if (payment) {
        await prisma.payments.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            verificationStatus: "DECLINED", // ✅ DECLINED FOR FAILED PAYMENTS
            paystackStatus: "failed",
            notes: `${payment.notes} | Failed: ${event.data.gateway_response}`,
            updatedAt: new Date(),
          },
        });
        console.log("✅ Payment marked as FAILED");
      }
    }

    return NextResponse.json({
      message: "Webhook processed successfully",
    });
  } catch (error: any) {
    console.error("❌ Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}