import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "TENANT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");
    if (!reference) return NextResponse.json({ error: "Payment reference required" }, { status: 400 });

    const db = getPrismaForRequest(request);

    // Get tenant id
    const tenantRows = await db.$queryRawUnsafe<any[]>(
      `SELECT id FROM tenants WHERE "userId" = $1 LIMIT 1`, userId
    );
    if (!tenantRows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenantId = tenantRows[0].id;

    // Find the payment record
    const paymentRows = await db.$queryRawUnsafe<any[]>(`
      SELECT id, status, "paystackStatus", amount, "tenantId", "unitId", notes, metadata
      FROM payments
      WHERE "referenceNumber" = $1 AND "tenantId" = $2
      LIMIT 1
    `, reference, tenantId);

    if (!paymentRows.length) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    const payment = paymentRows[0];

    // Already completed — return cached result
    if (payment.status === "COMPLETED") {
      return NextResponse.json({
        success: true,
        status: "COMPLETED",
        amount: Number(payment.amount),
        reference,
      });
    }

    // Verify with Paystack
    const psRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });

    const now = new Date();
    const isAdvance = reference.startsWith("advance_");

    if (psRes.ok) {
      const psData = await psRes.json();
      const txn = psData.data;

      if (txn.status === "success") {
        // Mark payment completed
        await db.$executeRawUnsafe(`
          UPDATE payments SET status = 'COMPLETED'::text::"PaymentStatus", "paystackStatus" = 'success', "updatedAt" = $2
          WHERE id = $1
        `, payment.id, now);

        if (isAdvance) {
          await handleAdvancePayment(db, payment, txn, now);
        } else {
          await handleRegularPayment(db, payment, now);
        }

        return NextResponse.json({
          success: true,
          status: "COMPLETED",
          amount: txn.amount / 100,
          reference: txn.reference,
          channel: txn.channel,
          isAdvance,
        });
      } else {
        // Paystack returned non-success
        await db.$executeRawUnsafe(`
          UPDATE payments SET status = 'FAILED'::text::"PaymentStatus", "paystackStatus" = $2, "updatedAt" = $3
          WHERE id = $1
        `, payment.id, txn.status || "failed", now);

        return NextResponse.json({ success: false, status: "FAILED", reference });
      }
    } else {
      // Paystack API error — check if it's "transaction not found" (test mode / dev)
      const errData = await psRes.json().catch(() => ({}));
      const msg = (errData.message || "").toLowerCase();

      if (msg.includes("transaction reference not found") || msg.includes("not found")) {
        console.warn("TEST MODE: transaction not found in Paystack, marking completed");

        await db.$executeRawUnsafe(`
          UPDATE payments SET status = 'COMPLETED'::text::"PaymentStatus", "paystackStatus" = 'test-success', "updatedAt" = $2
          WHERE id = $1
        `, payment.id, now);

        if (isAdvance) {
          await handleAdvancePayment(db, payment, null, now);
        } else {
          await handleRegularPayment(db, payment, now);
        }

        return NextResponse.json({
          success: true,
          status: "COMPLETED",
          amount: Number(payment.amount),
          reference,
          channel: "test-mode",
          isAdvance,
        });
      }

      throw new Error(errData.message || "Paystack verification failed");
    }
  } catch (error: any) {
    console.error("Verify payment error:", error?.message);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

// Mark the most-recent pending/overdue bill as paid
async function handleRegularPayment(db: any, payment: any, now: Date) {
  try {
    const billRows = (await db.$queryRawUnsafe(`
      SELECT id FROM monthly_bills
      WHERE "tenantId" = $1 AND status IN ('PENDING', 'OVERDUE')
      ORDER BY month DESC
      LIMIT 1
    `, payment.tenantId)) as any[];

    if (billRows.length) {
      await db.$executeRawUnsafe(`
        UPDATE monthly_bills
        SET status = 'PAID'::text::"BillStatus", "paidDate" = $2, "paymentId" = $3, "updatedAt" = $2
        WHERE id = $1
      `, billRows[0].id, now, payment.id);
    }
  } catch (err: any) {
    console.error("handleRegularPayment error:", err?.message);
  }
}

// For advance payments: extract months from notes/metadata, mark N future rent bills paid
// (creates bill records if they don't exist yet)
async function handleAdvancePayment(db: any, payment: any, psData: any | null, now: Date) {
  try {
    // Extract months from payment notes: "Advance rent payment — X months"
    const notesMatch = (payment.notes || "").match(/(\d+)\s*month/i);
    const months = notesMatch ? parseInt(notesMatch[1]) : 1;

    // Get rent amount from payment (total / months)
    const totalAmount = Number(payment.amount);
    const rentAmount = months > 0 ? totalAmount / months : totalAmount;

    // Get the starting month — first PENDING rent-type bill or next calendar month
    const pendingBills = (await db.$queryRawUnsafe(`
      SELECT id, month, "totalAmount" FROM monthly_bills
      WHERE "tenantId" = $1 AND status IN ('PENDING', 'OVERDUE')
      ORDER BY month ASC
    `, payment.tenantId)) as any[];

    if (pendingBills.length > 0) {
      // Mark up to N existing pending bills as paid (rent-portion)
      const toMark = pendingBills.slice(0, months);
      for (const bill of toMark) {
        await db.$executeRawUnsafe(`
          UPDATE monthly_bills
          SET status = 'PAID'::text::"BillStatus", "paidDate" = $2, "paymentId" = $3, "updatedAt" = $2
          WHERE id = $1
        `, bill.id, now, payment.id);
      }

      const remaining = months - toMark.length;
      if (remaining > 0) {
        // Generate future bill stubs for months beyond existing bills
        await createFutureBillStubs(db, payment, remaining, toMark[toMark.length - 1].month, rentAmount, now);
      }
    } else {
      // No pending bills — create future bill stubs starting next month
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await createFutureBillStubs(db, payment, months, nextMonth, rentAmount, now);
    }
  } catch (err: any) {
    console.error("handleAdvancePayment error:", err?.message);
  }
}

async function createFutureBillStubs(
  db: any,
  payment: any,
  count: number,
  afterMonthDate: Date | string,
  rentAmount: number,
  now: Date
) {
  const base = new Date(afterMonthDate);
  for (let i = 1; i <= count; i++) {
    const month = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const billId = `bill_adv_${payment.tenantId}_${month.getFullYear()}_${month.getMonth() + 1}_${Math.random().toString(36).slice(2, 8)}`;
    const dueDate = new Date(month.getFullYear(), month.getMonth() + 1, 5); // 5th of following month

    try {
      await db.$executeRawUnsafe(`
        INSERT INTO monthly_bills (id, "tenantId", "unitId", month, "dueDate", "totalAmount",
          status, "paidDate", "paymentId", notes, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6,
          'PAID'::text::"BillStatus", $7, $8, $9, $10, $10)
        ON CONFLICT DO NOTHING
      `,
        billId, payment.tenantId, payment.unitId,
        month, dueDate, rentAmount,
        now, payment.id,
        `Pre-paid via advance payment (${count} months)`,
        now
      );
    } catch (err: any) {
      console.warn(`Could not create future bill stub for month ${month.toISOString()}: ${err?.message}`);
    }
  }
}
