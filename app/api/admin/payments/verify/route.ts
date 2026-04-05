import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForTenant } from "@/lib/prisma";
import { resend, EMAIL_CONFIG } from "@/lib/resend";

export const dynamic = 'force-dynamic'

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
    const payment = await getPrismaForTenant(request).payments.findUnique({
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
    const updatedPayment = await getPrismaForTenant(request).payments.update({
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
      const bill = await getPrismaForTenant(request).monthly_bills.findFirst({
        where: {
          tenantId: payment.tenantId,
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (bill) {
        await getPrismaForTenant(request).monthly_bills.update({
          where: { id: bill.id },
          data: {
            status: "PAID",
            paidDate: new Date(),
            paymentId: paymentId,
          },
        });
      }
    }

    // Send email notification to tenant
    try {
      const tenantUser = payment.tenants?.users;
      const unit = payment.tenants?.units;
      if (tenantUser?.email) {
        const isApproved = verificationStatus === "APPROVED";
        await resend.emails.send({
          from: EMAIL_CONFIG.from,
          to: tenantUser.email,
          replyTo: EMAIL_CONFIG.replyTo,
          subject: isApproved
            ? `✅ Payment Verified - KSH ${Number(payment.amount).toLocaleString()}`
            : `❌ Payment Not Verified - Action Required`,
          html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden"><div style="background:${isApproved ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)'};padding:30px;text-align:center"><h1 style="color:#fff;margin:0">🏠 Makeja Homes</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0">Payment ${isApproved ? 'Verified' : 'Not Verified'}</p></div><div style="padding:32px"><h2 style="color:#1f2937">Hello ${tenantUser.firstName},</h2><p style="color:#4b5563">${isApproved ? 'Your payment has been verified and approved.' : 'Your payment could not be verified. Please contact your property manager.'}</p><div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid ${isApproved ? '#10b981' : '#ef4444'}"><p style="margin:6px 0;color:#374151"><strong>Amount:</strong> KSH ${Number(payment.amount).toLocaleString()}</p><p style="margin:6px 0;color:#374151"><strong>Reference:</strong> ${payment.referenceNumber || updatedPayment.id}</p>${unit ? `<p style="margin:6px 0;color:#374151"><strong>Unit:</strong> ${unit.unitNumber}</p>` : ''}<p style="margin:6px 0;color:#374151"><strong>Status:</strong> ${verificationStatus}</p>${verificationNotes ? `<p style="margin:6px 0;color:#374151"><strong>Notes:</strong> ${verificationNotes}</p>` : ''}<p style="margin:6px 0;color:#374151"><strong>Date:</strong> ${new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div></div></div></body></html>`,
        });
      }
    } catch (emailErr) {
      console.error("⚠️ Failed to send verification email:", emailErr);
    }

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
