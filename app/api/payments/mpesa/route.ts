import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'
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
// Body: { phone, amount, leaseId, billId?, description? }
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))

    const { phone, amount, leaseId, billId, description } = await request.json()
    if (!phone || !amount) return NextResponse.json({ error: 'phone and amount are required' }, { status: 400 })

    const shortcode = process.env.MPESA_SHORTCODE
    const passkey = process.env.MPESA_PASSKEY
    const callbackUrl = process.env.MPESA_CALLBACK_URL

    if (!shortcode || !passkey || !callbackUrl) {
      return NextResponse.json({ error: 'M-Pesa not configured on this server' }, { status: 503 })
    }

    const formattedPhone = formatPhone(String(phone))
    const timestamp = stkTimestamp()
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')
    const env = process.env.MPESA_ENV === 'production' ? 'api' : 'sandbox'

    const accessToken = await getDarajaToken()

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
        AccountReference: leaseId ? `LEASE-${leaseId.slice(-6).toUpperCase()}` : 'MAKEJA',
        TransactionDesc: description ?? 'Rent Payment — Makeja Homes',
      }),
    })

    const stkData = await stkRes.json()

    if (!stkRes.ok || stkData.ResponseCode !== '0') {
      console.error('[STK Push]', stkData)
      return NextResponse.json({ error: stkData.errorMessage ?? stkData.ResponseDescription ?? 'STK Push failed' }, { status: 400 })
    }

    // Store the checkout request ID so the callback can match it
    const prisma = getPrismaForRequest(request)
    await prisma.$executeRawUnsafe(
      `INSERT INTO mpesa_transactions (id, checkout_request_id, merchant_request_id, phone, amount, lease_id, bill_id, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',NOW())
       ON CONFLICT DO NOTHING`,
      `mpesa_${nanoid(10)}`,
      stkData.CheckoutRequestID,
      stkData.MerchantRequestID,
      formattedPhone,
      Number(amount),
      leaseId ?? null,
      billId ?? null,
    ).catch(() => {
      // Table may not exist yet — ignore and log
      console.log('[STK] mpesa_transactions table not available, skipping record')
    })

    return NextResponse.json({
      success: true,
      checkoutRequestId: stkData.CheckoutRequestID,
      message: `A payment request of KES ${Math.round(Number(amount))} has been sent to ${formattedPhone}. Please check your phone and enter your M-Pesa PIN.`,
    })
  } catch (err: any) {
    console.error('[mpesa POST]', err?.message)
    return NextResponse.json({ error: err.message ?? 'M-Pesa request failed' }, { status: 500 })
  }
}

// POST /api/payments/mpesa/callback — Daraja calls this after payment completes
// This is a PUBLIC endpoint (no auth cookie — Safaricom calls it)
