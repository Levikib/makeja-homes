import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'
import { limiters } from '@/lib/rate-limit'
import { resend, EMAIL_CONFIG } from '@/lib/resend'

export const dynamic = 'force-dynamic'

// Helper to escape CSV cell
function csvCell(v: unknown): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

function monthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString('en-KE', { month: 'long', year: 'numeric' })
}

function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0) // month 0-based trick: day 0 = last day of prev month
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await limiters.bulk(ip)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before running another bulk operation.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER'].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body
    const prisma = getPrismaForRequest(request)

    // ── Generate bills for all active leases ──────────────────────────────────
    if (action === 'generate-bills') {
      const { month, year } = body
      if (!month || !year) return NextResponse.json({ error: 'month and year required' }, { status: 400 })

      const dueDate = lastDayOfMonth(Number(year), Number(month))

      const activeLeases = await prisma.$queryRawUnsafe<Array<{
        id: string; tenantId: string; unitId: string; rentAmount: number
      }>>(
        `SELECT id, "tenantId", "unitId", "rentAmount" FROM lease_agreements WHERE status = 'ACTIVE'`
      )

      let created = 0
      let skipped = 0
      const errors: string[] = []

      for (const lease of activeLeases) {
        try {
          const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
            `SELECT id FROM monthly_bills WHERE "tenantId"=$1 AND month=$2 AND year=$3 LIMIT 1`,
            lease.tenantId, Number(month), Number(year)
          )
          if (existing.length > 0) { skipped++; continue }

          const billId = `bill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          const rent = Number(lease.rentAmount)
          await prisma.$executeRawUnsafe(
            `INSERT INTO monthly_bills (id, "tenantId", "unitId", month, year, "rentAmount", "waterAmount", "garbageAmount", "otherAmount", "totalAmount", status, "dueDate", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 0, $7, 'PENDING', $8, NOW(), NOW())`,
            billId, lease.tenantId, lease.unitId, Number(month), Number(year), rent, rent, dueDate
          )
          created++
        } catch (e: any) {
          errors.push(`Lease ${lease.id}: ${e.message}`)
        }
      }

      return NextResponse.json({ success: true, created, skipped, errors })
    }

    // ── Mark overdue ──────────────────────────────────────────────────────────
    if (action === 'mark-bills-overdue') {
      const result = await prisma.$executeRawUnsafe(
        `UPDATE monthly_bills SET status='OVERDUE', "updatedAt"=NOW() WHERE status IN ('PENDING','UNPAID') AND "dueDate" < NOW()`
      )
      return NextResponse.json({ success: true, updated: result })
    }

    // ── Mark bills as paid ────────────────────────────────────────────────────
    if (action === 'mark-bills-paid') {
      const { ids } = body
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'ids array required' }, { status: 400 })
      }
      const result = await prisma.$executeRawUnsafe(
        `UPDATE monthly_bills SET status='PAID', "paidDate"=NOW(), "updatedAt"=NOW() WHERE id = ANY($1::text[])`,
        ids
      )
      return NextResponse.json({ success: true, updated: result })
    }

    // ── Send payment reminders ────────────────────────────────────────────────
    if (action === 'send-reminders') {
      const { tenantIds, propertyId, billIds } = body

      let whereClause = `WHERE mb.status IN ('PENDING','OVERDUE','UNPAID')`
      const params: unknown[] = []
      let paramIdx = 1

      if (billIds && Array.isArray(billIds) && billIds.length > 0) {
        whereClause += ` AND mb.id = ANY($${paramIdx}::text[])`
        params.push(billIds)
        paramIdx++
      } else if (tenantIds && Array.isArray(tenantIds) && tenantIds.length > 0) {
        whereClause += ` AND mb."tenantId" = ANY($${paramIdx}::text[])`
        params.push(tenantIds)
        paramIdx++
      } else if (propertyId && propertyId !== 'all') {
        whereClause += ` AND u."propertyId" = $${paramIdx}`
        params.push(propertyId)
        paramIdx++
      }

      const bills = await prisma.$queryRawUnsafe<Array<{
        id: string
        tenantId: string
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
          mb.id, mb."tenantId", mb.month, mb.year, mb."totalAmount", mb."rentAmount", mb."dueDate", mb.status,
          usr."firstName", usr."lastName", usr.email, usr."phoneNumber",
          u."unitNumber", p.name AS "propertyName"
        FROM monthly_bills mb
        JOIN tenants t ON t.id = mb."tenantId"
        JOIN users usr ON usr.id = t."userId"
        JOIN units u ON u.id = mb."unitId"
        JOIN properties p ON p.id = u."propertyId"
        ${whereClause}
        ORDER BY mb."dueDate" ASC`,
        ...params
      )

      if (bills.length === 0) {
        return NextResponse.json({ success: true, sent: 0, failed: 0, total: 0, message: 'No matching bills found' })
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
          console.error(`[BULK:send-reminders] Failed for ${bill.email}:`, e?.message)
          failed++
        }
      }

      return NextResponse.json({ success: true, sent, failed, total: bills.length })
    }

    // ── Bulk verify/reject payments ───────────────────────────────────────────
    if (action === 'bulk-verify-payments') {
      const { ids, verificationStatus, verificationNotes, verifiedById } = body
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'ids array required' }, { status: 400 })
      }
      const validStatuses = ['APPROVED', 'REJECTED']
      if (!validStatuses.includes(verificationStatus)) {
        return NextResponse.json({ error: 'Invalid verificationStatus' }, { status: 400 })
      }

      const paymentStatus = verificationStatus === 'APPROVED' ? 'COMPLETED' : 'REJECTED'
      const resolvedVerifiedById = verifiedById ?? (payload.id as string)

      const result = await prisma.$executeRawUnsafe(
        `UPDATE payments
         SET "verificationStatus"=$2::text::"VerificationStatus",
             "verifiedById"=$3,
             "verifiedAt"=NOW(),
             status=$4::text::"PaymentStatus",
             notes=COALESCE($5, notes),
             "updatedAt"=NOW()
         WHERE id = ANY($1::text[])`,
        ids, verificationStatus, resolvedVerifiedById, paymentStatus, verificationNotes ?? null
      )
      return NextResponse.json({ success: true, updated: result })
    }

    // ── Export payments CSV ───────────────────────────────────────────────────
    if (action === 'export-payments-csv') {
      const { from, to, status, propertyId, paymentType, method } = body

      const conditions: string[] = []
      const params: unknown[] = []
      let idx = 1

      if (from) { conditions.push(`p."paidAt" >= $${idx++}`); params.push(new Date(from)) }
      if (to) { conditions.push(`p."paidAt" <= $${idx++}`); params.push(new Date(to)) }
      if (status && status !== 'all') { conditions.push(`p.status::text = $${idx++}`); params.push(status) }
      if (propertyId && propertyId !== 'all') { conditions.push(`pr.id = $${idx++}`); params.push(propertyId) }
      if (paymentType && paymentType !== 'all') {
        conditions.push(`COALESCE(p."paymentType", p.type::text) = $${idx++}`)
        params.push(paymentType)
      }
      if (method && method !== 'all') {
        conditions.push(`COALESCE(p."paymentMethod", p.method::text) = $${idx++}`)
        params.push(method)
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

      const rows = await prisma.$queryRawUnsafe<Array<{
        paidAt: Date | null
        reference: string | null
        firstName: string
        lastName: string
        email: string
        phoneNumber: string | null
        propertyName: string
        unitNumber: string
        paymentType: string
        method: string
        amount: number
        status: string
        verificationStatus: string | null
        notes: string | null
      }>>(
        `SELECT
          p."paidAt",
          COALESCE(p."referenceNumber", p.reference) AS reference,
          usr."firstName", usr."lastName", usr.email, usr."phoneNumber",
          pr.name AS "propertyName",
          u."unitNumber",
          COALESCE(p."paymentType", p.type::text) AS "paymentType",
          COALESCE(p."paymentMethod", p.method::text) AS "method",
          p.amount,
          p.status::text AS status,
          p."verificationStatus"::text AS "verificationStatus",
          p.notes
        FROM payments p
        JOIN tenants t ON t.id = p."tenantId"
        JOIN users usr ON usr.id = t."userId"
        JOIN units u ON u.id = p."unitId"
        JOIN properties pr ON pr.id = u."propertyId"
        ${where}
        ORDER BY p."paidAt" DESC NULLS LAST
        LIMIT 10000`,
        ...params
      )

      const headers = ['Date', 'Reference', 'Tenant', 'Email', 'Phone', 'Property', 'Unit', 'Type', 'Method', 'Amount (KES)', 'Status', 'Verification Status', 'Notes']
      const csvRows = rows.map(r => [
        r.paidAt ? new Date(r.paidAt).toLocaleDateString('en-KE') : '',
        r.reference ?? '',
        `${r.firstName} ${r.lastName}`,
        r.email,
        r.phoneNumber ?? '',
        r.propertyName,
        r.unitNumber,
        r.paymentType ?? '',
        r.method ?? '',
        Number(r.amount).toFixed(2),
        r.status,
        r.verificationStatus ?? '',
        r.notes ?? '',
      ].map(csvCell))

      const csv = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payments-${Date.now()}.csv"`,
        },
      })
    }

    // ── Export arrears CSV ────────────────────────────────────────────────────
    if (action === 'export-arrears-csv') {
      const { propertyId, minDaysOverdue } = body

      const conditions: string[] = [`mb.status IN ('OVERDUE','UNPAID','PENDING')`, `mb."dueDate" < NOW()`]
      const params: unknown[] = []
      let idx = 1

      if (propertyId && propertyId !== 'all') {
        conditions.push(`u."propertyId" = $${idx++}`)
        params.push(propertyId)
      }
      if (minDaysOverdue && Number(minDaysOverdue) > 0) {
        conditions.push(`EXTRACT(DAY FROM NOW() - mb."dueDate") >= $${idx++}`)
        params.push(Number(minDaysOverdue))
      }

      const where = `WHERE ${conditions.join(' AND ')}`

      const rows = await prisma.$queryRawUnsafe<Array<{
        month: number
        year: number
        dueDate: Date
        daysOverdue: number
        firstName: string
        lastName: string
        email: string
        phoneNumber: string | null
        propertyName: string
        unitNumber: string
        rentAmount: number
        waterAmount: number
        garbageAmount: number
        totalAmount: number
        status: string
      }>>(
        `SELECT
          mb.month, mb.year, mb."dueDate",
          EXTRACT(DAY FROM NOW() - mb."dueDate")::INTEGER AS "daysOverdue",
          usr."firstName", usr."lastName", usr.email, usr."phoneNumber",
          p.name AS "propertyName",
          u."unitNumber",
          mb."rentAmount", mb."waterAmount", mb."garbageAmount", mb."totalAmount",
          mb.status
        FROM monthly_bills mb
        JOIN tenants t ON t.id = mb."tenantId"
        JOIN users usr ON usr.id = t."userId"
        JOIN units u ON u.id = mb."unitId"
        JOIN properties p ON p.id = u."propertyId"
        ${where}
        ORDER BY mb."dueDate" ASC`,
        ...params
      )

      const headers = ['Month', 'Year', 'Due Date', 'Days Overdue', 'Tenant', 'Email', 'Phone', 'Property', 'Unit', 'Rent', 'Water', 'Garbage', 'Total', 'Status']
      const csvRows = rows.map(r => [
        r.month,
        r.year,
        new Date(r.dueDate).toLocaleDateString('en-KE'),
        r.daysOverdue,
        `${r.firstName} ${r.lastName}`,
        r.email,
        r.phoneNumber ?? '',
        r.propertyName,
        r.unitNumber,
        Number(r.rentAmount).toFixed(2),
        Number(r.waterAmount).toFixed(2),
        Number(r.garbageAmount).toFixed(2),
        Number(r.totalAmount).toFixed(2),
        r.status,
      ].map(csvCell))

      const csv = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="arrears-${Date.now()}.csv"`,
        },
      })
    }

    // ── Export tenants CSV ────────────────────────────────────────────────────
    if (action === 'export-tenants-csv') {
      const { propertyId, status } = body

      const conditions: string[] = []
      const params: unknown[] = []
      let idx = 1

      if (propertyId && propertyId !== 'all') {
        conditions.push(`u."propertyId" = $${idx++}`)
        params.push(propertyId)
      }
      if (status && status !== 'all') {
        conditions.push(`t.status = $${idx++}`)
        params.push(status)
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

      const rows = await prisma.$queryRawUnsafe<Array<{
        firstName: string
        lastName: string
        email: string
        phoneNumber: string | null
        unitNumber: string
        propertyName: string
        rentAmount: number
        depositAmount: number
        moveInDate: Date | null
        status: string | null
      }>>(
        `SELECT
          usr."firstName", usr."lastName", usr.email, usr."phoneNumber",
          u."unitNumber",
          p.name AS "propertyName",
          t."rentAmount", t."depositAmount",
          t."moveInDate",
          t.status
        FROM tenants t
        JOIN users usr ON usr.id = t."userId"
        JOIN units u ON u.id = t."unitId"
        JOIN properties p ON p.id = u."propertyId"
        ${where}
        ORDER BY p.name, u."unitNumber"`,
        ...params
      )

      const headers = ['Name', 'Email', 'Phone', 'Unit', 'Property', 'Rent Amount', 'Deposit Amount', 'Move-in Date', 'Status']
      const csvRows = rows.map(r => [
        `${r.firstName} ${r.lastName}`,
        r.email,
        r.phoneNumber ?? '',
        r.unitNumber,
        r.propertyName,
        Number(r.rentAmount).toFixed(2),
        Number(r.depositAmount ?? 0).toFixed(2),
        r.moveInDate ? new Date(r.moveInDate).toLocaleDateString('en-KE') : '',
        r.status ?? '',
      ].map(csvCell))

      const csv = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="tenants-${Date.now()}.csv"`,
        },
      })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err: any) {
    console.error('[BULK]', err?.message)
    return NextResponse.json({ error: 'Bulk operation failed' }, { status: 500 })
  }
}
