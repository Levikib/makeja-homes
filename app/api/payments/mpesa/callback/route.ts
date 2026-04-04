import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

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

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stk
    const success = ResultCode === 0

    let amount = 0, mpesaCode = '', phone = ''
    if (success && CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === 'Amount') amount = Number(item.Value)
        if (item.Name === 'MpesaReceiptNumber') mpesaCode = item.Value
        if (item.Name === 'PhoneNumber') phone = String(item.Value)
      }
    }

    console.log(`[mpesa callback] ${success ? 'SUCCESS' : 'FAILED'} | ${CheckoutRequestID} | ${mpesaCode} | ${amount}`)

    // TODO: match CheckoutRequestID → mpesa_transactions record, then mark
    // the linked payment as COMPLETED or create a new payment record.
    // This requires the mpesa_transactions table which may not yet be migrated.
    // For now, log and acknowledge — prevents Daraja retries.

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (err: any) {
    console.error('[mpesa callback]', err?.message)
    // Always return 200 to Daraja, otherwise it retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}
