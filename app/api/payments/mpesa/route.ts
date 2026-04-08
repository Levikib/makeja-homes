import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'
import { patchPaymentsSchema } from '@/lib/patch-payments-schema'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

// ── Daraja (Safaricom M-Pesa) helpers ─────────────────────────────

async function getDarajaToken(): Promise<string> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET
  if (!consumerKey || !consumerSecret) throw new Error('M-Pesa credentials not configured')

  const base64 = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
  const env = process.env.MPESA_ENV === 'production' ? 'api' : 'sandbox'
  const res = await fetch(`https://${env}.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${base64}` },
  })
  if (!res.ok) throw new Error('Failed to get Daraja token')
  const data = await res.json()
  return data.access_token
}

function formatPhone(phone: string): string {
  // Normalise to 2547XXXXXXXX
  phone = phone.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '')
  if (phone.startsWith('7') || phone.startsWith('1')) phone = `254${phone}`
  return phone
}

function stkTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

// POST /api/payments/mpesa — initiate STK Push
// Body: { phone, amount, billId?, depositMode?: boolean, description? }
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { payload: jwtPayload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    const userId = jwtPayload.id as string | undefined ?? jwtPayload.userId as string | undefined
    const tenantSlug = jwtPayload.tenantSlug as string | undefined

    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { phone, amount, billId, depositMode, description } = await request.json()
    if (!phone || !amount) return NextResponse.json({ error: 'phone and amount are required' }, { status: 400 })

    const shortcode = process.env.MPESA_SHORTCODE
    const passkey = process.env.MPESA_PASSKEY
    const callbackUrl = process.env.MPESA_CALLBACK_URL

    if (!shortcode || !passkey || !callbackUrl) {
      return NextResponse.json({ error: 'M-Pesa not configured on this server' }, { status: 503 })
    }

    const db = getPrismaForRequest(request)

    // Ensure mpesa_transactions table exists
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS mpesa_transactions (
        id TEXT PRIMARY KEY,
        checkout_request_id TEXT UNIQUE,
        merchant_request_id TEXT,
        phone TEXT,
        amount DOUBLE PRECISION,
        tenant_id TEXT,
        unit_id TEXT,
        bill_id TEXT,
        deposit BOOLEAN DEFAULT false,
        tenant_slug TEXT,
        status TEXT DEFAULT 'PENDING',
        mpesa_code TEXT,
        result_desc TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Look up the tenant record for this user
    const tenantRows = await db.$queryRawUnsafe<any[]>(
      `SELECT t.id as "tenantId", t."unitId", u.email, u."firstName", un."unitNumber", p.name as "propertyName"
       FROM tenants t
       JOIN users u ON u.id = t."userId"
       JOIN units un ON un.id = t."unitId"
       JOIN properties p ON p.id = un."propertyId"
       WHERE t."userId" = $1 LIMIT 1`,
      userId,
    )

    const tenant = tenantRows[0] ?? null
    const tenantId = tenant?.tenantId ?? null
    const unitId = tenant?.unitId ?? null

    // Initiate STK Push
    const formattedPhone = formatPhone(String(phone))
    const timestamp = stkTimestamp()
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')
    const env = process.env.MPESA_ENV === 'production' ? 'api' : 'sandbox'

    const accessToken = await getDarajaToken()

    const accountRef = depositMode
      ? 'DEPOSIT'
      : billId
        ? `BILL-${String(billId).slice(-6).toUpperCase()}`
        : 'RENT'

    const stkRes = await fetch(`https://${env}.safaricom.co.ke/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(Number(amount)),
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: accountRef,
        TransactionDesc: description ?? (depositMode ? 'Security Deposit — Makeja Homes' : 'Rent Payment — Makeja Homes'),
      }),
    })

    const stkData = await stkRes.json()

    if (!stkRes.ok || stkData.ResponseCode !== '0') {
      console.error('[STK Push]', stkData)
      return NextResponse.json({ error: stkData.errorMessage ?? stkData.ResponseDescription ?? 'STK Push failed' }, { status: 400 })
    }

    const txId = `mpesa_${nanoid(10)}`
    const checkoutRequestId = stkData.CheckoutRequestID
    const reference = `mpesa_${checkoutRequestId}`
    const paymentType = depositMode ? 'DEPOSIT' : 'RENT'

    // Persist the STK transaction record
    await db.$executeRawUnsafe(
      `INSERT INTO mpesa_transactions
         (id, checkout_request_id, merchant_request_id, phone, amount, tenant_id, unit_id, bill_id, deposit, tenant_slug, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', NOW(), NOW())
       ON CONFLICT (checkout_request_id) DO NOTHING`,
      txId,
      checkoutRequestId,
      stkData.MerchantRequestID,
      formattedPhone,
      Number(amount),
      tenantId,
      unitId,
      billId ?? null,
      depositMode === true,
      tenantSlug ?? null,
    )

    // Ensure the payments table has the extra runtime columns
    await patchPaymentsSchema(db)

    // Insert a PENDING payment record
    const now = new Date()
    if (tenantId && unitId) {
      await db.$executeRawUnsafe(
        `INSERT INTO payments
           (id, "referenceNumber", reference, "tenantId", "unitId", amount,
            "paymentType", type, "paymentMethod", method,
            status, "createdById", notes, "createdAt", "updatedAt")
         VALUES ($1, $2, $2, $3, $4, $5,
           $6, $6::text::"PaymentType",
           'M_PESA', 'M_PESA'::text::"PaymentMethod",
           'PENDING'::text::"PaymentStatus", $7, $8, $9, $9)
         ON CONFLICT DO NOTHING`,
        `pay_mpesa_${nanoid(8)}`,
        reference,
        tenantId,
        unitId,
        Number(amount),
        paymentType,
        userId,
        `M-Pesa STK Push initiated — awaiting PIN confirmation`,
        now,
      )
    }

    return NextResponse.json({
      success: true,
      checkoutRequestId,
      message: `A payment request of KES ${Math.round(Number(amount))} has been sent to ${formattedPhone}. Please check your phone and enter your M-Pesa PIN.`,
    })
  } catch (err: any) {
    console.error('[mpesa POST]', err?.message)
    return NextResponse.json({ error: err.message ?? 'M-Pesa request failed' }, { status: 500 })
  }
}
