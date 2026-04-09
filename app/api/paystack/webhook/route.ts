import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.error("❌ Invalid Paystack webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log("📱 Paystack webhook:", event.event);

    if (event.event === "charge.success") {
      const { reference, amount, paid_at, channel, customer } = event.data;
      const db = getPrismaForRequest(request);

      // Find payment by reference
      const paymentRows = await db.$queryRawUnsafe<any[]>(
        `SELECT id, "tenantId", "paymentType"::text AS "paymentType", notes FROM payments WHERE "referenceNumber" = $1 LIMIT 1`,
        reference
      );

      if (!paymentRows.length) {
        console.error("❌ Payment not found for reference:", reference);
        return NextResponse.json({ message: "Payment not found" });
      }

      const payment = paymentRows[0];
      const now = new Date();
      const paidAt = new Date(paid_at);

      // Mark payment COMPLETED + AUTO-APPROVED
      await db.$executeRawUnsafe(
        `UPDATE payments SET
           status = 'COMPLETED',
           "verificationStatus" = 'APPROVED',
           "verifiedAt" = $1,
           "transactionId" = $2,
           "paystackReference" = $3,
           "paystackStatus" = 'success',
           "paystackData" = $4::jsonb,
           notes = COALESCE(notes, '') || $5,
           "updatedAt" = $6
         WHERE id = $7`,
        paidAt,
        String(event.data.id),
        reference,
        JSON.stringify(event.data),
        ` | Channel: ${channel} | Customer: ${customer.email} | Auto-verified via Paystack`,
        now,
        payment.id
      );

      console.log("✅ Payment marked COMPLETED:", reference);

      // ── If this was a DEPOSIT payment, upsert security_deposits ──────────
      if (payment.paymentType === "DEPOSIT") {
        try {
          // Self-heal security_deposits table
          await db.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS security_deposits (
              id TEXT PRIMARY KEY,
              "tenantId" TEXT NOT NULL,
              amount DOUBLE PRECISION NOT NULL DEFAULT 0,
              status TEXT NOT NULL DEFAULT 'HELD',
              "paidDate" TIMESTAMP,
              "refundDate" TIMESTAMP,
              "refundAmount" DOUBLE PRECISION,
              "deductionsTotal" DOUBLE PRECISION DEFAULT 0,
              "refundMethod" TEXT,
              "refundNotes" TEXT,
              "createdAt" TIMESTAMP DEFAULT NOW(),
              "updatedAt" TIMESTAMP DEFAULT NOW()
            )
          `);

          const depositAmt = amount / 100; // Paystack sends kobo/cents

          // Upsert: if record exists update it, otherwise create
          const existing = await db.$queryRawUnsafe<any[]>(
            `SELECT id FROM security_deposits WHERE "tenantId" = $1 LIMIT 1`,
            payment.tenantId
          );

          if (existing.length) {
            await db.$executeRawUnsafe(
              `UPDATE security_deposits
               SET status = 'HELD', amount = $1, "paidDate" = $2, "updatedAt" = $3
               WHERE "tenantId" = $4`,
              depositAmt, paidAt, now, payment.tenantId
            );
          } else {
            await db.$executeRawUnsafe(
              `INSERT INTO security_deposits (id, "tenantId", amount, status, "paidDate", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, 'HELD', $4, $5, $5)`,
              `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              payment.tenantId, depositAmt, paidAt, now
            );
          }
          console.log("✅ security_deposits upserted for tenant:", payment.tenantId);
        } catch (depErr: any) {
          console.error("❌ security_deposits upsert failed:", depErr?.message);
        }
      }

      // ── Mark matching bill as PAID (for rent/bill payments) ──────────────
      if (payment.paymentType !== "DEPOSIT") {
        try {
          const billRows = await db.$queryRawUnsafe<any[]>(
            `SELECT id FROM monthly_bills WHERE "tenantId" = $1 AND status::text = 'UNPAID'
             ORDER BY month DESC LIMIT 1`,
            payment.tenantId
          );
          if (billRows.length) {
            await db.$executeRawUnsafe(
              `UPDATE monthly_bills SET status = 'PAID', "paidDate" = $1, "paymentId" = $2, "updatedAt" = $3 WHERE id = $4`,
              paidAt, payment.id, now, billRows[0].id
            );
            console.log("✅ Bill marked PAID:", billRows[0].id);
          }
        } catch (billErr: any) {
          console.error("❌ Bill update failed:", billErr?.message);
        }
      }

      // ── Activity log ──────────────────────────────────────────────────────
      await db.$executeRawUnsafe(
        `INSERT INTO activity_logs (id, "userId", action, "entityType", "entityId", details, "createdAt")
         VALUES ($1, $2, 'PAYMENT_COMPLETED', 'payment', $3, $4::jsonb, $5)
         ON CONFLICT DO NOTHING`,
        `log_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        payment.tenantId,
        payment.id,
        JSON.stringify({ reference, amount: amount / 100, channel, paymentType: payment.paymentType }),
        now
      ).catch(() => {});
    }

    if (event.event === "charge.failed") {
      const { reference } = event.data;
      const db = getPrismaForRequest(request);

      await db.$executeRawUnsafe(
        `UPDATE payments SET status = 'FAILED', "verificationStatus" = 'DECLINED',
         "paystackStatus" = 'failed', notes = COALESCE(notes, '') || $1, "updatedAt" = $2
         WHERE "referenceNumber" = $3`,
        ` | Failed: ${event.data.gateway_response}`,
        new Date(),
        reference
      );
      console.log("❌ Payment failed:", reference);
    }

    return NextResponse.json({ message: "Webhook processed successfully" });
  } catch (error: any) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
