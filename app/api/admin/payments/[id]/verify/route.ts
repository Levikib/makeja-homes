import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;
    const role = payload.role as string;

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const paymentId = params.id;
    const body = await request.json();
    const { verificationStatus, verificationNotes } = body;

    console.log("🔍 Verifying payment:", paymentId, "Status:", verificationStatus);

    // Validate verification status
    if (!["APPROVED", "DECLINED"].includes(verificationStatus)) {
      return NextResponse.json(
        { error: "Invalid verification status" },
        { status: 400 }
      );
    }

    // If declining, require a reason
    if (verificationStatus === "DECLINED" && !verificationNotes) {
      return NextResponse.json(
        { error: "Decline reason is required" },
        { status: 400 }
      );
    }

    // Fetch payment to verify it exists and belongs to admin's property
    const payment = await prisma.payments.findFirst({
      where: {
        id: paymentId,
        units: {
          properties: {
            createdById: userId,
          },
        },
      },
      include: {
        units: {
          include: {
            properties: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Update payment verification status
    const updatedPayment = await prisma.payments.update({
      where: { id: paymentId },
      data: {
        verificationStatus,
        verificationNotes,
        verifiedById: userId,
        verifiedAt: new Date(),
        // If approved, also update payment status
        status: verificationStatus === "APPROVED" ? "COMPLETED" : payment.status,
        updatedAt: new Date(),
      },
    });

    // If approved, also mark the associated bill as PAID
    if (verificationStatus === "APPROVED") {
      // Find the bill for this payment
      const bill = await prisma.monthly_bills.findFirst({
        where: {
          tenantId: payment.tenantId,
          status: { not: "PAID" },
          totalAmount: payment.amount,
        },
        orderBy: {
          month: "desc",
        },
      });

      if (bill) {
        await prisma.monthly_bills.update({
          where: { id: bill.id },
          data: {
            status: "PAID",
            paidDate: new Date(),
            updatedAt: new Date(),
          },
        });
        console.log("✅ Bill marked as PAID:", bill.id);
      }
    }

    console.log("✅ Payment verification updated:", verificationStatus);

    return NextResponse.json({
      success: true,
      message: `Payment ${verificationStatus === "APPROVED" ? "approved" : "declined"} successfully`,
      payment: updatedPayment,
    });
  } catch (error: any) {
    console.error("❌ Error verifying payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}