import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { resend, EMAIL_CONFIG } from '@/lib/resend'

export const dynamic = 'force-dynamic'

// ── DB helpers (no request context — called directly by Safaricom) ──

function buildTenantUrl(schemaName: string): string {
  const base = (process.env.DIRECT_DATABASE_URL || process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || '')
    .replace('-pooler.', '.')
    .replace(/[?&]schema=[^&]*/g, '')
    .replace(/[?&]options=[^&]*/g, '')
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}options=--search_path%3D${schemaName}`
}

function getPrismaForSchema(schema: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: buildTenantUrl(schema) } },
    log: ['error'],
  })
}

function getMasterPrisma(): PrismaClient {
  const url = (process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || '')
    .replace('-pooler.', '.')
  return new PrismaClient({ datasources: { db: { url } }, log: ['error'] })
}

// ── Find the mpesa_transaction across all tenant schemas ──────────

async function findTransaction(checkoutRequestId: string): Promise<{ tx: any; schema: string; db: PrismaClient } | null> {
  const master = getMasterPrisma()
  let schemas: string[]
  try {
    const rows = await master.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name
    `
    schemas = rows.map(r => r.schema_name)
  } finally {
    await master.$disconnect()
  }

  for (const schema of schemas) {
    const db = getPrismaForSchema(schema)
    try {
      // Check table exists first
      const tableCheck = await db.$queryRawUnsafe<any[]>(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'mpesa_transactions' LIMIT 1`,
        schema,
      )
      if (!tableCheck.length) { await db.$disconnect(); continue }

      const rows = await db.$queryRawUnsafe<any[]>(
        `SELECT * FROM mpesa_transactions WHERE checkout_request_id = $1 LIMIT 1`,
        checkoutRequestId,
      )
      if (rows.length) return { tx: rows[0], schema, db }
    } catch {
      // schema might not have the table yet
    }
    await db.$disconnect()
  }
  return null
}

// POST /api/payments/mpesa/callback
// Called by Safaricom Daraja after STK Push completes (success or failure).
// No auth required — Safaricom calls this directly.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const stk = body?.Body?.stkCallback

    if (!stk) {
      console.warn('[mpesa callback] Unexpected payload shape:', JSON.stringify(body))
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stk
    const success = ResultCode === 0

    let amount = 0, mpesaCode = '', phone = ''
    if (success && CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === 'Amount') amount = Number(item.Value)
        if (item.Name === 'MpesaReceiptNumber') mpesaCode = String(item.Value)
        if (item.Name === 'PhoneNumber') phone = String(item.Value)
      }
    }

    console.log(`[mpesa callback] ${success ? 'SUCCESS' : 'FAILED'} | ${CheckoutRequestID} | ${mpesaCode} | ${amount}`)

    // Find the transaction across all schemas
    const found = await findTransaction(CheckoutRequestID)
    if (!found) {
      console.warn('[mpesa callback] No transaction found for', CheckoutRequestID)
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    const { tx, db } = found
    const reference = `mpesa_${CheckoutRequestID}`

    if (success) {
      // 1. Mark mpesa_transaction as COMPLETED
      await db.$executeRawUnsafe(
        `UPDATE mpesa_transactions SET status='COMPLETED', mpesa_code=$1, updated_at=NOW() WHERE checkout_request_id=$2`,
        mpesaCode,
        CheckoutRequestID,
      )

      // 2. Mark the linked payment record as COMPLETED
      await db.$executeRawUnsafe(
        `UPDATE payments
         SET status='COMPLETED'::text::"PaymentStatus",
             "mpesaCode"=$1,
             "paystackStatus"='mpesa-success',
             "updatedAt"=NOW()
         WHERE reference=$2 OR "referenceNumber"=$2`,
        mpesaCode,
        reference,
      ).catch((e: any) => console.warn('[mpesa callback] payment update error:', e?.message))

      // Fetch the payment id for bill linking
      const payRows = await db.$queryRawUnsafe<any[]>(
        `SELECT id FROM payments WHERE reference=$1 OR "referenceNumber"=$1 LIMIT 1`,
        reference,
      ).catch(() => [] as any[])
      const paymentId = payRows[0]?.id ?? null

      // 3. Mark bill as PAID if bill_id present
      if (tx.bill_id) {
        await db.$executeRawUnsafe(
          `UPDATE monthly_bills SET status='PAID', "paidDate"=NOW(), "paymentId"=$1 WHERE id=$2`,
          paymentId,
          tx.bill_id,
        ).catch((e: any) => console.warn('[mpesa callback] bill update error:', e?.message))
      } else if (!tx.deposit && tx.tenant_id) {
        // No specific bill — mark the oldest outstanding bill for this tenant
        await db.$executeRawUnsafe(
          `UPDATE monthly_bills
           SET status='PAID', "paidDate"=NOW(), "paymentId"=$1
           WHERE id = (
             SELECT id FROM monthly_bills
             WHERE "tenantId"=$2 AND status IN ('PENDING','OVERDUE','UNPAID')
             ORDER BY year ASC, month ASC
             LIMIT 1
           )`,
          paymentId,
          tx.tenant_id,
        ).catch((e: any) => console.warn('[mpesa callback] auto-bill update error:', e?.message))
      }

      // 4. Handle security deposit
      if (tx.deposit && tx.tenant_id) {
        // Try update first, then insert
        const updated = await db.$executeRawUnsafe(
          `UPDATE security_deposits
           SET status='HELD', amount=$1, "paidDate"=NOW(), notes='Paid via M-Pesa STK — ' || $2
           WHERE "tenantId"=$3`,
          amount || tx.amount,
          mpesaCode,
          tx.tenant_id,
        ).catch(() => 0)

        if (!updated) {
          await db.$executeRawUnsafe(
            `INSERT INTO security_deposits ("tenantId", amount, status, "paidDate", notes, "createdAt", "updatedAt")
             VALUES ($1, $2, 'HELD', NOW(), $3, NOW(), NOW())
             ON CONFLICT DO NOTHING`,
            tx.tenant_id,
            amount || tx.amount,
            `Paid via M-Pesa STK — ${mpesaCode}`,
          ).catch((e: any) => console.warn('[mpesa callback] deposit insert error:', e?.message))
        }
      }

      // 5. Send confirmation email
      try {
        const userRows = await db.$queryRawUnsafe<any[]>(
          `SELECT u.email, u."firstName"
           FROM tenants t JOIN users u ON u.id = t."userId"
           WHERE t.id = $1 LIMIT 1`,
          tx.tenant_id,
        )
        const user = userRows[0]
        if (user?.email && process.env.RESEND_API_KEY) {
          const subject = tx.deposit
            ? 'Security Deposit Received — Makeja Homes'
            : 'Rent Payment Confirmed — Makeja Homes'
          const bodyText = tx.deposit
            ? `Hi ${user.firstName},\n\nYour security deposit of KES ${Math.round(amount || tx.amount).toLocaleString()} has been received (M-Pesa code: ${mpesaCode}). Your tenancy is now active.\n\nThank you,\nMakeja Homes`
            : `Hi ${user.firstName},\n\nYour rent payment of KES ${Math.round(amount || tx.amount).toLocaleString()} has been confirmed (M-Pesa code: ${mpesaCode}).\n\nThank you for your payment!\n\nMakeja Homes`

          await resend.emails.send({
            from: EMAIL_CONFIG.from,
            to: user.email,
            subject,
            text: bodyText,
          }).catch((e: any) => console.warn('[mpesa callback] email send error:', e?.message))
        }
      } catch (emailErr: any) {
        console.warn('[mpesa callback] email lookup error:', emailErr?.message)
      }
    } else {
      // Payment failed
      await db.$executeRawUnsafe(
        `UPDATE mpesa_transactions SET status='FAILED', result_desc=$1, updated_at=NOW() WHERE checkout_request_id=$2`,
        ResultDesc ?? 'Failed',
        CheckoutRequestID,
      )

      await db.$executeRawUnsafe(
        `UPDATE payments
         SET status='FAILED'::text::"PaymentStatus", "updatedAt"=NOW()
         WHERE reference=$1 OR "referenceNumber"=$1`,
        reference,
      ).catch((e: any) => console.warn('[mpesa callback] payment fail update error:', e?.message))
    }

    await db.$disconnect()

    // Always return 200 with this body — Safaricom retries on anything else
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (err: any) {
    console.error('[mpesa callback]', err?.message)
    // Always return 200 to Daraja, otherwise it retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}
