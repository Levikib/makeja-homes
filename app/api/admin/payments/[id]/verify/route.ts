import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (!["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const paymentId = params.id;
    const body = await request.json();
    const { verificationStatus, verificationNotes } = body;

    if (!["APPROVED", "DECLINED"].includes(verificationStatus)) {
      return NextResponse.json({ error: "Invalid verification status" }, { status: 400 });
    }

    if (verificationStatus === "DECLINED" && !verificationNotes) {
      return NextResponse.json({ error: "Decline reason is required" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);
    const now = new Date();

    // Fetch payment
    const payments = await db.$queryRawUnsafe<any[]>(
      `SELECT p.*, t."tenantId" FROM payments p WHERE p.id = $1 LIMIT 1`,
      paymentId
    );

    if (!payments.length) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const payment = payments[0];

    // Update payment verification
    const newStatus = verificationStatus === "APPROVED" ? `'COMPLETED'::text::"PaymentStatus"` : `$5::text::"PaymentStatus"`;
    await db.$executeRawUnsafe(
      `UPDATE payments SET
        "verificationStatus" = $2::text::"VerificationStatus",
        "verificationNotes" = $3,
        "verifiedById" = $4,
        "verifiedAt" = $6,
        status = CASE WHEN $2 = 'APPROVED' THEN 'COMPLETED'::text::"PaymentStatus" ELSE status END,
        "updatedAt" = $6
       WHERE id = $1`,
      paymentId, verificationStatus, verificationNotes || null, userId, payment.status, now
    );

    // If approved, mark matching unpaid bill as PAID
    if (verificationStatus === "APPROVED" && payment.tenantId) {
      try {
        const bills = await db.$queryRawUnsafe<any[]>(
          `SELECT id FROM monthly_bills WHERE "tenantId" = $1 AND status != 'PAID'::text::"BillStatus" AND "totalAmount" = $2 ORDER BY month DESC LIMIT 1`,
          payment.tenantId, payment.amount
        );
        if (bills.length) {
          await db.$executeRawUnsafe(
            `UPDATE monthly_bills SET status = 'PAID'::text::"BillStatus", "paidDate" = $2, "updatedAt" = $2 WHERE id = $1`,
            bills[0].id, now
          );
        }
      } catch {}
    }

    // Audit log (best-effort)
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
         VALUES ($1, $2, $3, 'payment', $4, $5::jsonb, $6)`,
        `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        userId,
        verificationStatus === "APPROVED" ? "PAYMENT_APPROVED" : "PAYMENT_DECLINED",
        paymentId,
        JSON.stringify({ verificationStatus, verificationNotes: verificationNotes ?? null, amount: payment.amount, tenantId: payment.tenantId }),
        now
      );
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Payment ${verificationStatus === "APPROVED" ? "approved" : "declined"} successfully`,
    });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
