import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { paymentId, verificationStatus, verificationNotes } = body;

    if (!paymentId || !verificationStatus) {
      return NextResponse.json(
        { error: "Payment ID and verification status required" },
        { status: 400 }
      );
    }

    if (!["APPROVED", "DECLINED"].includes(verificationStatus)) {
      return NextResponse.json(
        { error: "Invalid verification status" },
        { status: 400 }
      );
    }

    // Get payment details
    const payment = await prisma.payments.findUnique({
      where: { id: paymentId },
      include: {
        tenants: {
          include: {
            users: true,
            units: {
              include: {
                properties: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Update payment verification
    const updatedPayment = await prisma.payments.update({
      where: { id: paymentId },
      data: {
        verificationStatus,
        verificationNotes,
        verifiedById: userId,
        verifiedAt: new Date(),
        status: verificationStatus === "APPROVED" ? "COMPLETED" : "FAILED",
      },
    });

    // If approved, update the related bill
    if (verificationStatus === "APPROVED" && payment.leaseId) {
      // Find and update monthly bill
      const bill = await prisma.monthly_bills.findFirst({
        where: {
          tenantId: payment.tenantId,
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (bill) {
        await prisma.monthly_bills.update({
          where: { id: bill.id },
          data: {
            status: "PAID",
            paidDate: new Date(),
            paymentId: paymentId,
          },
        });
      }
    }

    // TODO: Send email notification to tenant
    // Implementation in next phase

    return NextResponse.json({
      success: true,
      message: `Payment ${verificationStatus.toLowerCase()} successfully`,
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
