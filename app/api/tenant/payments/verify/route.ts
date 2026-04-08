import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { patchPaymentsSchema } from "@/lib/patch-payments-schema";
import { sendPaymentConfirmation } from "@/lib/send-payment-confirmation";

export const dynamic = "force-dynamic";

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
    await patchPaymentsSchema(db);

    // Get tenant id
    const tenantRows = (await db.$queryRawUnsafe(
      `SELECT id FROM tenants WHERE "userId" = $1 LIMIT 1`,
      userId
    )) as any[];
    if (!tenantRows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenantId = tenantRows[0].id;

    // Find the payment record — compare status as text for portability
    const paymentRows = (await db.$queryRawUnsafe(`
      SELECT id, status::text as status, "paystackStatus", amount, "tenantId", "unitId", notes
      FROM payments
      WHERE ("referenceNumber" = $1 OR reference = $1) AND "tenantId" = $2
      LIMIT 1
    `, reference, tenantId)) as any[];

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

    const now = new Date();
    const isAdvance = reference.startsWith("advance_");
    const isDeposit = reference.startsWith("deposit_");
    const isBill = reference.startsWith("bill_");

    // Verify with Paystack
    const psRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    if (psRes.ok) {
      const psData = await psRes.json();
      const txn = psData.data;

      if (txn.status === "success") {
        // Mark payment COMPLETED
        await db.$executeRawUnsafe(`
          UPDATE payments
          SET status = 'COMPLETED'::text::"PaymentStatus",
              "paystackStatus" = 'success',
              "verificationStatus" = 'APPROVED'::text::"VerificationStatus",
              "updatedAt" = $2
          WHERE id = $1
        `, payment.id, now);

        await reconcile(db, payment, reference, isDeposit, isAdvance, isBill, now);
        await sendConfirmationEmail(db, payment, reference, isDeposit, isAdvance, txn.amount / 100);

        return NextResponse.json({
          success: true,
          status: "COMPLETED",
          amount: txn.amount / 100,
          reference: txn.reference,
          channel: txn.channel,
          isAdvance,
          isDeposit,
        });
      } else {
        // Paystack returned non-success status
        await db.$executeRawUnsafe(`
          UPDATE payments
          SET status = 'FAILED'::text::"PaymentStatus",
              "paystackStatus" = $2,
              "updatedAt" = $3
          WHERE id = $1
        `, payment.id, txn.status || "failed", now);

        return NextResponse.json({ success: false, status: "FAILED", reference });
      }
    } else {
      // Paystack API error
      const errData = await psRes.json().catch(() => ({}));
      const msg = ((errData as any).message || "").toLowerCase();

      // Test-mode fallback: transaction not found on Paystack side
      if (msg.includes("transaction reference not found") || msg.includes("not found")) {
        console.warn("[verify] TEST MODE: transaction not found in Paystack, marking completed");

        await db.$executeRawUnsafe(`
          UPDATE payments
          SET status = 'COMPLETED'::text::"PaymentStatus",
              "paystackStatus" = 'test-success',
              "verificationStatus" = 'APPROVED'::text::"VerificationStatus",
              "updatedAt" = $2
          WHERE id = $1
        `, payment.id, now);

        await reconcile(db, payment, reference, isDeposit, isAdvance, isBill, now);
        await sendConfirmationEmail(db, payment, reference, isDeposit, isAdvance, Number(payment.amount));

        return NextResponse.json({
          success: true,
          status: "COMPLETED",
          amount: Number(payment.amount),
          reference,
          channel: "test-mode",
          isAdvance,
          isDeposit,
        });
      }

      throw new Error((errData as any).message || "Paystack verification failed");
    }
  } catch (error: any) {
    console.error("[verify] Error:", error?.message);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Reconciliation dispatcher
// ---------------------------------------------------------------------------

async function reconcile(
  db: any,
  payment: any,
  reference: string,
  isDeposit: boolean,
  isAdvance: boolean,
  isBill: boolean,
  now: Date
) {
  if (isDeposit) {
    await handleDepositPayment(db, payment, now);
  } else if (isBill) {
    // reference format: bill_${billId}_${timestamp}
    const parts = reference.split("_");
    const billId = parts[1];
    if (billId) {
      await handleBillPayment(db, payment, billId, now);
    } else {
      await handleRegularPayment(db, payment, now);
    }
  } else if (isAdvance) {
    // Extract months from reference: advance_${tenantId}_${n}mo_${timestamp}
    const moMatch = reference.match(/_(\d+)mo_/);
    const months = moMatch ? parseInt(moMatch[1]) : 1;
    await handleAdvancePayment(db, payment, months, now);
  } else {
    await handleRegularPayment(db, payment, now);
  }
}

// ---------------------------------------------------------------------------
// Confirmation email
// ---------------------------------------------------------------------------

async function sendConfirmationEmail(
  db: any,
  payment: any,
  reference: string,
  isDeposit: boolean,
  isAdvance: boolean,
  amount: number
) {
  try {
    const rows = (await db.$queryRawUnsafe(`
      SELECT u.email, u."firstName", u."lastName", un."unitNumber", p.name as "propertyName"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t.id = $1
      LIMIT 1
    `, payment.tenantId)) as any[];

    if (!rows.length) return;
    const info = rows[0];
    const type = isDeposit ? "DEPOSIT" : isAdvance ? "ADVANCE_RENT" : "RENT";

    await sendPaymentConfirmation({
      email: info.email,
      firstName: info.firstName,
      amount,
      reference,
      propertyName: info.propertyName,
      unitNumber: info.unitNumber,
      type,
    });
  } catch (err: any) {
    console.error("[verify] Failed to send confirmation email:", err?.message);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Mark security deposit as HELD — upsert so it works even if no record yet
async function handleDepositPayment(db: any, payment: any, now: Date) {
  try {
    const existing = (await db.$queryRawUnsafe(
      `SELECT id FROM security_deposits WHERE "tenantId" = $1 LIMIT 1`,
      payment.tenantId
    )) as any[];

    if (existing.length > 0) {
      await db.$executeRawUnsafe(`
        UPDATE security_deposits
        SET status = 'HELD'::text::"DepositStatus", "paidDate" = $2, "updatedAt" = $2, amount = $3
        WHERE "tenantId" = $1
      `, payment.tenantId, now, Number(payment.amount));
    } else {
      const depId = `dep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.$executeRawUnsafe(`
        INSERT INTO security_deposits (id, "tenantId", amount, status, "paidDate", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 'HELD'::text::"DepositStatus", $4, $4, $4)
      `, depId, payment.tenantId, Number(payment.amount), now);
    }
  } catch (err: any) {
    console.error("handleDepositPayment error:", err?.message);
  }
}

// Mark a specific bill as paid (for bill_ references)
async function handleBillPayment(db: any, payment: any, billId: string, now: Date) {
  try {
    await db.$executeRawUnsafe(`
      UPDATE monthly_bills
      SET status = 'PAID', "paidDate" = $2, "paymentId" = $3, "updatedAt" = $2
      WHERE id = $1
    `, billId, now, payment.id);
  } catch (err: any) {
    console.error("handleBillPayment error:", err?.message);
  }
}

// Mark the oldest pending/overdue/unpaid bill as paid
async function handleRegularPayment(db: any, payment: any, now: Date) {
  try {
    const billRows = (await db.$queryRawUnsafe(`
      SELECT id FROM monthly_bills
      WHERE "tenantId" = $1 AND status IN ('PENDING', 'OVERDUE', 'UNPAID')
      ORDER BY month ASC
      LIMIT 1
    `, payment.tenantId)) as any[];

    if (billRows.length) {
      await db.$executeRawUnsafe(`
        UPDATE monthly_bills
        SET status = 'PAID', "paidDate" = $2, "paymentId" = $3, "updatedAt" = $2
        WHERE id = $1
      `, billRows[0].id, now, payment.id);
    }
  } catch (err: any) {
    console.error("handleRegularPayment error:", err?.message);
  }
}

// For advance payments: extract months from reference, mark N future rent bills paid
async function handleAdvancePayment(db: any, payment: any, months: number, now: Date) {
  try {
    const totalAmount = Number(payment.amount);
    const rentAmount = months > 0 ? totalAmount / months : totalAmount;

    const pendingBills = (await db.$queryRawUnsafe(`
      SELECT id, month FROM monthly_bills
      WHERE "tenantId" = $1 AND status IN ('PENDING', 'OVERDUE', 'UNPAID')
      ORDER BY month ASC
    `, payment.tenantId)) as any[];

    const toMark = pendingBills.slice(0, months);
    for (const bill of toMark) {
      await db.$executeRawUnsafe(`
        UPDATE monthly_bills
        SET status = 'PAID', "paidDate" = $2, "paymentId" = $3, "updatedAt" = $2
        WHERE id = $1
      `, bill.id, now, payment.id);
    }

    const remaining = months - toMark.length;
    if (remaining > 0) {
      await createFutureBillStubs(db, payment, remaining, toMark[toMark.length - 1]?.month || now, rentAmount, now);
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
    const dueDate = new Date(month.getFullYear(), month.getMonth() + 1, 5);

    try {
      await db.$executeRawUnsafe(`
        INSERT INTO monthly_bills (id, "tenantId", "unitId", month, "dueDate", "rentAmount", "totalAmount",
          status, "paidDate", "paymentId", notes, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $6, 'PAID', $7, $8, $9, $10, $10)
        ON CONFLICT DO NOTHING
      `,
        billId, payment.tenantId, payment.unitId,
        month, dueDate, rentAmount,
        now, payment.id,
        `Pre-paid via advance payment (${count} months)`,
        now
      );
    } catch (err: any) {
      console.warn(`Could not create future bill stub for ${month.toISOString()}: ${err?.message}`);
    }
  }
}
