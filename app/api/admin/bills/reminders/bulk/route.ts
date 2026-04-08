import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'
import { resend, EMAIL_CONFIG } from '@/lib/resend'

export const dynamic = 'force-dynamic'

function monthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString('en-KE', { month: 'long', year: 'numeric' })
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    const role = payload.role as string
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { billIds, propertyId, tenantIds } = body

    const prisma = getPrismaForRequest(request)

    const conditions: string[] = [`mb.status IN ('PENDING','OVERDUE','UNPAID')`]
    const params: unknown[] = []
    let idx = 1

    if (billIds && Array.isArray(billIds) && billIds.length > 0) {
      conditions.push(`mb.id = ANY($${idx++}::text[])`)
      params.push(billIds)
    } else if (tenantIds && Array.isArray(tenantIds) && tenantIds.length > 0) {
      conditions.push(`mb."tenantId" = ANY($${idx++}::text[])`)
      params.push(tenantIds)
    } else if (propertyId) {
      conditions.push(`u."propertyId" = $${idx++}`)
      params.push(propertyId)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const bills = await prisma.$queryRawUnsafe<Array<{
      id: string
      month: number
      year: number
      totalAmount: number
      rentAmount: number
      dueDate: Date
      status: string
      firstName: string
      lastName: string
      email: string
      phoneNumber: string | null
      unitNumber: string
      propertyName: string
    }>>(
      `SELECT
        mb.id, mb.month, mb.year, mb."totalAmount", mb."rentAmount", mb."dueDate", mb.status,
        usr."firstName", usr."lastName", usr.email, usr."phoneNumber",
        u."unitNumber", p.name AS "propertyName"
      FROM monthly_bills mb
      JOIN tenants t ON t.id = mb."tenantId"
      JOIN users usr ON usr.id = t."userId"
      JOIN units u ON u.id = mb."unitId"
      JOIN properties p ON p.id = u."propertyId"
      ${where}
      ORDER BY mb."dueDate" ASC`,
      ...params
    )

    if (bills.length === 0) {
      return NextResponse.json({ error: 'No bills found' }, { status: 404 })
    }

    let sent = 0
    let failed = 0

    for (const bill of bills) {
      const name = `${bill.firstName} ${bill.lastName}`
      const label = monthLabel(bill.month, bill.year)
      const due = new Date(bill.dueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
      const amount = Number(bill.totalAmount ?? bill.rentAmount).toLocaleString('en-KE', { minimumFractionDigits: 2 })

      try {
        await resend.emails.send({
          from: EMAIL_CONFIG.from,
          replyTo: EMAIL_CONFIG.replyTo,
          to: bill.email,
          subject: `Payment Reminder — ${label} Rent Due`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Segoe UI',Arial,sans-serif;color:#e5e5e5;">
  <div style="max-width:520px;margin:32px auto;background:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
    <div style="background:linear-gradient(135deg,#7c3aed,#ea580c);padding:28px 32px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;">Payment Reminder</h1>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">${label}</p>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;font-size:15px;">Hi <strong>${name}</strong>,</p>
      <p style="margin:0 0 20px;font-size:14px;color:#aaa;">This is a friendly reminder that your rent payment is due.</p>
      <div style="background:#252525;border-radius:10px;padding:20px 24px;margin-bottom:24px;border:1px solid #333;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Amount Due</span>
          <span style="font-size:28px;font-weight:700;color:#f97316;">KES ${amount}</span>
        </div>
        <div style="border-top:1px solid #333;padding-top:12px;display:grid;gap:8px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;">
            <span style="color:#888;">Unit</span>
            <span style="color:#e5e5e5;">${bill.unitNumber} — ${bill.propertyName}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;">
            <span style="color:#888;">Period</span>
            <span style="color:#e5e5e5;">${label}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;">
            <span style="color:#888;">Due Date</span>
            <span style="color:#fbbf24;font-weight:600;">${due}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;">
            <span style="color:#888;">Status</span>
            <span style="color:#ef4444;font-weight:600;text-transform:uppercase;">${bill.status}</span>
          </div>
        </div>
      </div>
      <p style="margin:0 0 12px;font-size:13px;color:#aaa;">
        Please make your payment as soon as possible to avoid late fees. If you have already paid,
        kindly disregard this notice or contact the property manager with your payment reference.
      </p>
      <p style="margin:0;font-size:13px;color:#aaa;">
        For any questions or to report a payment, please contact your property manager directly.
      </p>
    </div>
    <div style="padding:16px 32px;background:#111;border-top:1px solid #222;text-align:center;">
      <p style="margin:0;font-size:11px;color:#555;">${bill.propertyName} &bull; Powered by Makeja Homes</p>
    </div>
  </div>
</body>
</html>`,
        })
        sent++
      } catch (e: any) {
        console.error(`[REMINDERS:bulk] Failed for ${bill.email}:`, e?.message)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} reminder${sent !== 1 ? 's' : ''} successfully`,
      stats: { sent, failed, total: bills.length },
    })
  } catch (error: any) {
    console.error('[REMINDERS:bulk]', error?.message)
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 })
  }
}
