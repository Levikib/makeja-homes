import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { verifyPayment } from "@/lib/paystack";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json(
        { error: "Payment reference required" },
        { status: 400 }
      );
    }

    console.log("🔍 Verifying payment:", reference);

    // Find payment in database
    const payment = await prisma.payments.findFirst({
      where: {
        referenceNumber: reference,
        tenants: { userId },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // If already completed, return status
    if (payment.status === "COMPLETED") {
      return NextResponse.json({
        success: true,
        status: "COMPLETED",
        amount: payment.amount,
        reference: payment.referenceNumber,
      });
    }

    // Verify with Paystack
    try {
      const verification = await verifyPayment(reference);

      console.log("✅ Paystack verification result:", verification.success);

      if (verification.success) {
        // Update payment to COMPLETED
        await prisma.payments.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            paystackStatus: "success",
            updatedAt: new Date(),
          },
        });

        // Update bill
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
              paidDate: new Date(),
              paymentId: payment.id,
              updatedAt: new Date(),
            },
          });
        }

        return NextResponse.json({
          success: true,
          status: "COMPLETED",
          amount: verification.amount,
          reference: verification.reference,
          channel: verification.channel,
        });
      } else {
        // Payment failed
        await prisma.payments.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            paystackStatus: "failed",
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: false,
          status: "FAILED",
          reference,
        });
      }
    } catch (verifyError) {
      console.error("❌ Verification error:", verifyError);
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("❌ Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
