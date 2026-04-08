import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { patchPaymentsSchema } from "@/lib/patch-payments-schema";
import { sendPaymentConfirmation } from "@/lib/send-payment-confirmation";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function buildTenantUrl(schemaName: string): string {
  const base = (
    process.env.DIRECT_DATABASE_URL ||
    process.env.MASTER_DATABASE_URL ||
    process.env.DATABASE_URL ||
    ""
  )
    .replace("-pooler.", ".")
    .replace(/[?&]schema=[^&]*/g, "")
    .replace(/[?&]options=[^&]*/g, "");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}options=--search_path%3D${schemaName}`;
}

function getMasterPrisma(): PrismaClient {
  const url = (process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || "")
    .replace("-pooler.", ".");
  return new PrismaClient({ datasources: { db: { url } }, log: ["error"] });
}

function getTenantPrisma(schemaName: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: buildTenantUrl(schemaName) } },
    log: ["error"],
  });
}

/**
 * Given a tenantId from Paystack metadata, find which tenant schema it belongs to.
 * Strategy: query information_schema for all tenant_* schemas, then probe each.
 */
async function findSchemaForTenant(tenantId: string): Promise<string | null> {
  const master = getMasterPrisma();
  let schemas: string[] = [];
  try {
    const rows = await master.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
      ORDER BY schema_name
    `;
    schemas = rows.map((r) => r.schema_name);
  } finally {
    await master.$disconnect();
  }

  for (const schema of schemas) {
    const db = getTenantPrisma(schema);
    try {
      const rows = await db.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM tenants WHERE id = $1 LIMIT 1`,
        tenantId
      );
      if (rows.length > 0) return schema;
    } catch {
      // Schema may not have tenants table yet — skip
    } finally {
      await db.$disconnect();
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reconciliation helpers (mirror of verify/route.ts but tenant-schema-aware)
// ---------------------------------------------------------------------------

async function handleDepositPayment(db: any, payment: any, now: Date) {
  try {
    const existing = (await db.$queryRawUnsafe(
      `SELECT id FROM security_deposits WHERE "tenantId" = $1 LIMIT 1`,
      payment.tenantId
    )) as any[];

    if (existing.length > 0) {
      await db.$executeRawUnsafe(
        `UPDATE security_deposits
         SET status = 'HELD'::text::"DepositStatus", "paidDate" = $2, "updatedAt" = $2, amount = $3
         WHERE "tenantId" = $1`,
        payment.tenantId,
        now,
        Number(payment.amount)
      );
    } else {
      const depId = `dep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.$executeRawUnsafe(
        `INSERT INTO security_deposits (id, "tenantId", amount, status, "paidDate", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'HELD'::text::"DepositStatus", $4, $4, $4)`,
        depId,
        payment.tenantId,
        Number(payment.amount),
        now
      );
    }
  } catch (err: any) {
    console.error("handleDepositPayment error:", err?.message);
  }
}

async function handleBillPayment(db: any, payment: any, billId: string, now: Date) {
  try {
    await db.$executeRawUnsafe(
      `UPDATE monthly_bills
       SET status = 'PAID', "paidDate" = $2, "paymentId" = $3, "updatedAt" = $2
       WHERE id = $1`,
      billId,
      now,
      payment.id
    );
  } catch (err: any) {
    console.error("handleBillPayment error:", err?.message);
  }
}

async function handleRegularPayment(db: any, payment: any, now: Date) {
  try {
    const billRows = (await db.$queryRawUnsafe(
      `SELECT id FROM monthly_bills
       WHERE "tenantId" = $1 AND status IN ('PENDING', 'OVERDUE', 'UNPAID')
       ORDER BY month ASC
       LIMIT 1`,
      payment.tenantId
    )) as any[];

    if (billRows.length) {
      await db.$executeRawUnsafe(
        `UPDATE monthly_bills
         SET status = 'PAID', "paidDate" = $2, "paymentId" = $3, "updatedAt" = $2
         WHERE id = $1`,
        billRows[0].id,
        now,
        payment.id
      );
    }
  } catch (err: any) {
    console.error("handleRegularPayment error:", err?.message);
  }
}

async function handleAdvancePayment(db: any, payment: any, months: number, now: Date) {
  try {
    const pendingBills = (await db.$queryRawUnsafe(
      `SELECT id, month FROM monthly_bills
       WHERE "tenantId" = $1 AND status IN ('PENDING', 'OVERDUE', 'UNPAID')
       ORDER BY month ASC`,
      payment.tenantId
    )) as any[];

    const toMark = pendingBills.slice(0, months);
    for (const bill of toMark) {
      await db.$executeRawUnsafe(
        `UPDATE monthly_bills
         SET status = 'PAID', "paidDate" = $2, "paymentId" = $3, "updatedAt" = $2
         WHERE id = $1`,
        bill.id,
        now,
        payment.id
      );
    }

    const remaining = months - toMark.length;
    if (remaining > 0) {
      const rentAmount = months > 0 ? Number(payment.amount) / months : Number(payment.amount);
      const baseDate =
        toMark.length > 0 ? new Date(toMark[toMark.length - 1].month) : new Date(now.getFullYear(), now.getMonth(), 1);

      for (let i = 1; i <= remaining; i++) {
        const month = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
        const billId = `bill_adv_${payment.tenantId}_${month.getFullYear()}_${month.getMonth() + 1}_${Math.random().toString(36).slice(2, 8)}`;
        const dueDate = new Date(month.getFullYear(), month.getMonth() + 1, 5);
        try {
          await db.$executeRawUnsafe(
            `INSERT INTO monthly_bills (id, "tenantId", "unitId", month, "dueDate", "rentAmount", "totalAmount",
               status, "paidDate", "paymentId", notes, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $6, 'PAID', $7, $8, $9, $10, $10)
             ON CONFLICT DO NOTHING`,
            billId,
            payment.tenantId,
            payment.unitId,
            month,
            dueDate,
            rentAmount,
            now,
            payment.id,
            `Pre-paid via advance payment (${months} months)`,
            now
          );
        } catch (err: any) {
          console.warn(`Could not create future bill stub: ${err?.message}`);
        }
      }
    }
  } catch (err: any) {
    console.error("handleAdvancePayment error:", err?.message);
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Always return 200 to Paystack even on errors — prevents retries for our bugs
  try {
    const signature = request.headers.get("x-paystack-signature");
    const body = await request.text();

    // Verify HMAC-SHA512 signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.error("[webhook] Invalid Paystack signature");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const event = JSON.parse(body);
    console.log("[webhook] Event:", event.event, "ref:", event.data?.reference);

    // -----------------------------------------------------------------------
    // charge.success
    // -----------------------------------------------------------------------
    if (event.event === "charge.success") {
      const { reference, amount, metadata } = event.data;
      const tenantId: string | undefined = metadata?.tenantId;
      const tenantSlugFromMeta: string | undefined = metadata?.tenantSlug;

      if (!tenantId) {
        console.error("[webhook] No tenantId in metadata for ref:", reference);
        return NextResponse.json({ received: true });
      }

      // Fast path: tenantSlug stored in metadata (new payments)
      // Fallback: scan all tenant schemas (legacy payments without slug in metadata)
      let schemaName: string | null = null;
      if (tenantSlugFromMeta) {
        schemaName = tenantSlugFromMeta.startsWith("tenant_")
          ? tenantSlugFromMeta
          : `tenant_${tenantSlugFromMeta}`;
      } else {
        schemaName = await findSchemaForTenant(tenantId);
      }
      if (!schemaName) {
        console.error("[webhook] Could not find schema for tenantId:", tenantId);
        return NextResponse.json({ received: true });
      }

      const db = getTenantPrisma(schemaName);
      try {
        await patchPaymentsSchema(db);
        const now = new Date();
        const amountKsh = amount / 100; // Paystack sends in kobo/cents

        // Find existing payment record — idempotency check
        const existingRows = (await db.$queryRawUnsafe(
          `SELECT id, status::text as status, "tenantId", "unitId", amount, notes
           FROM payments
           WHERE (reference = $1 OR "referenceNumber" = $1)
           LIMIT 1`,
          reference
        )) as any[];

        let paymentId: string;
        let paymentTenantId = tenantId;
        let paymentUnitId: string = metadata?.unitId || "";

        if (existingRows.length > 0) {
          const existing = existingRows[0];
          // Idempotency: already completed
          if (existing.status === "COMPLETED") {
            console.log("[webhook] Payment already COMPLETED, skipping:", reference);
            return NextResponse.json({ received: true });
          }
          paymentId = existing.id;
          paymentTenantId = existing.tenantId || tenantId;
          paymentUnitId = existing.unitId || paymentUnitId;

          // Update to COMPLETED
          await db.$executeRawUnsafe(
            `UPDATE payments
             SET status = 'COMPLETED'::text::"PaymentStatus",
                 "paystackStatus" = 'success',
                 "verificationStatus" = 'APPROVED'::text::"VerificationStatus",
                 "updatedAt" = $2
             WHERE id = $1`,
            paymentId,
            now
          );
        } else {
          // No payment record yet (webhook arrived before redirect) — insert one
          paymentId = `pay_wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

          // Detect type from reference prefix
          let payType = "RENT";
          if (reference.startsWith("deposit_")) payType = "DEPOSIT";
          else if (reference.startsWith("advance_")) payType = "RENT"; // advance still RENT type

          await db.$executeRawUnsafe(
            `INSERT INTO payments (
               id, reference, "referenceNumber", "tenantId", "unitId", amount,
               type, "paymentType",
               method, "paymentMethod",
               status, "paystackStatus", "paystackReference",
               "verificationStatus",
               "createdById", notes, "createdAt", "updatedAt"
             ) VALUES (
               $1, $2, $2, $3, $4, $5,
               $6::text::"PaymentType", $6,
               'PAYSTACK'::text::"PaymentMethod", 'PAYSTACK',
               'COMPLETED'::text::"PaymentStatus", 'success', $2,
               'APPROVED'::text::"VerificationStatus",
               $3, $7, $8, $8
             )`,
            paymentId,
            reference,
            paymentTenantId,
            paymentUnitId,
            amountKsh,
            payType,
            `Paystack payment (webhook) — ref: ${reference}`,
            now
          );
        }

        // Build a payment object for reconciliation helpers
        const paymentObj = {
          id: paymentId,
          tenantId: paymentTenantId,
          unitId: paymentUnitId,
          amount: amountKsh,
        };

        // Reconcile based on reference prefix
        if (reference.startsWith("deposit_")) {
          await handleDepositPayment(db, paymentObj, now);
        } else if (reference.startsWith("bill_")) {
          // reference format: bill_${billId}_${timestamp}
          // billId may contain underscores; timestamp is always the last numeric segment
          const withoutPrefix = reference.slice("bill_".length);
          const lastUnderscore = withoutPrefix.lastIndexOf("_");
          const billId = lastUnderscore > 0 ? withoutPrefix.slice(0, lastUnderscore) : withoutPrefix;
          if (billId) {
            await handleBillPayment(db, paymentObj, billId, now);
          } else {
            await handleRegularPayment(db, paymentObj, now);
          }
        } else if (reference.startsWith("advance_")) {
          // reference: advance_${tenantId}_${n}mo_${timestamp}
          const moMatch = reference.match(/_(\d+)mo_/);
          const months = moMatch ? parseInt(moMatch[1]) : 1;
          await handleAdvancePayment(db, paymentObj, months, now);
        } else {
          await handleRegularPayment(db, paymentObj, now);
        }

        // Send confirmation email
        try {
          const tenantInfoRows = (await db.$queryRawUnsafe(
            `SELECT u.email, u."firstName", u."lastName", un."unitNumber", p.name as "propertyName"
             FROM tenants t
             JOIN users u ON u.id = t."userId"
             JOIN units un ON un.id = t."unitId"
             JOIN properties p ON p.id = un."propertyId"
             WHERE t.id = $1
             LIMIT 1`,
            paymentTenantId
          )) as any[];
          if (tenantInfoRows.length > 0) {
            const info = tenantInfoRows[0];
            let payType = "RENT";
            if (reference.startsWith("deposit_")) payType = "DEPOSIT";
            else if (reference.startsWith("advance_")) payType = "ADVANCE_RENT";

            await sendPaymentConfirmation({
              email: info.email,
              firstName: info.firstName,
              amount: amountKsh,
              reference,
              propertyName: info.propertyName,
              unitNumber: info.unitNumber,
              type: payType,
            });
          }
        } catch (emailErr: any) {
          console.error("[webhook] Failed to send confirmation email:", emailErr?.message);
        }

        console.log("[webhook] charge.success processed:", reference);
      } finally {
        await db.$disconnect();
      }
    }

    // -----------------------------------------------------------------------
    // charge.failed — just log, no crash
    // -----------------------------------------------------------------------
    if (event.event === "charge.failed") {
      const { reference, metadata } = event.data;
      console.warn("[webhook] charge.failed:", reference, metadata?.tenantId);

      // Best-effort: mark any existing PENDING payment as FAILED
      if (metadata?.tenantId) {
        const failedSlug: string | undefined = metadata?.tenantSlug;
        const schemaName = failedSlug
          ? (failedSlug.startsWith("tenant_") ? failedSlug : `tenant_${failedSlug}`)
          : await findSchemaForTenant(metadata.tenantId).catch(() => null);
        if (schemaName) {
          const db = getTenantPrisma(schemaName);
          try {
            await db.$executeRawUnsafe(
              `UPDATE payments
               SET status = 'FAILED'::text::"PaymentStatus", "paystackStatus" = 'failed', "updatedAt" = NOW()
               WHERE (reference = $1 OR "referenceNumber" = $1)
                 AND status::text = 'PENDING'`,
              reference
            );
          } catch (err: any) {
            console.error("[webhook] Failed to mark payment as FAILED:", err?.message);
          } finally {
            await db.$disconnect();
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[webhook] Unhandled error:", error?.message);
    // Always 200 so Paystack doesn't retry
    return NextResponse.json({ received: true });
  }
}
