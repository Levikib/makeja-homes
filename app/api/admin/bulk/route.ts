import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'
import { limiters } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/admin/bulk
// body: { action, ids?, filters?, data }
// Supported actions:
//   generate-bills      — generate bills for all active leases for a given month
//   mark-bills-paid     — mark selected bill IDs as PAID
//   send-reminders      — send payment reminder emails for selected tenant IDs
//   bulk-verify-payments — approve or reject multiple payments at once
//   export-payments     — return CSV of payments (uses GET-like body for simplicity)

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = limiters.bulk(ip)
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

      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 1)
      const dueDate = new Date(year, month - 1, 28)

      const activeLeases = await prisma.lease_agreements.findMany({
        where: { status: 'ACTIVE' },
        include: { tenants: true },
      })

      let created = 0
      let skipped = 0
      const errors: string[] = []

      for (const lease of activeLeases) {
        try {
          const exists = await prisma.monthly_bills.findFirst({
            where: {
              tenantId: lease.tenantId,
              month: { gte: monthStart, lt: monthEnd },
            },
          })
          if (exists) { skipped++; continue }

          await prisma.monthly_bills.create({
            data: {
              id: `bill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              tenantId: lease.tenantId,
              unitId: lease.unitId,
              month: monthStart,
              rentAmount: Number(lease.rentAmount),
              waterAmount: 0,
              garbageAmount: 0,
              totalAmount: Number(lease.rentAmount),
              status: 'PENDING',
              dueDate,
            },
          })
          created++
        } catch (e: any) {
          errors.push(`Lease ${lease.id}: ${e.message}`)
        }
      }

      return NextResponse.json({ success: true, created, skipped, errors })
    }

    // ── Mark bills as paid ────────────────────────────────────────────────────
    if (action === 'mark-bills-paid') {
      const { ids } = body
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'ids array required' }, { status: 400 })
      }
      const result = await prisma.monthly_bills.updateMany({
        where: { id: { in: ids } },
        data: { status: 'PAID' },
      })
      return NextResponse.json({ success: true, updated: result.count })
    }

    // ── Mark bills as overdue ─────────────────────────────────────────────────
    if (action === 'mark-bills-overdue') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const result = await prisma.monthly_bills.updateMany({
        where: { status: { in: ['PENDING', 'UNPAID'] }, dueDate: { lt: today } },
        data: { status: 'OVERDUE' },
      })
      return NextResponse.json({ success: true, updated: result.count })
    }

    // ── Bulk verify/reject payments ───────────────────────────────────────────
    if (action === 'bulk-verify-payments') {
      const { ids, verificationStatus, verificationNotes } = body
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'ids array required' }, { status: 400 })
      }
      const validStatuses = ['APPROVED', 'REJECTED']
      if (!validStatuses.includes(verificationStatus)) {
        return NextResponse.json({ error: 'Invalid verificationStatus' }, { status: 400 })
      }

      const result = await prisma.payments.updateMany({
        where: { id: { in: ids } },
        data: {
          verificationStatus,
          verifiedById: payload.id as string,
          verifiedAt: new Date(),
          status: verificationStatus === 'APPROVED' ? 'COMPLETED' : 'FAILED',
          verificationNotes: verificationNotes ?? null,
        },
      })
      return NextResponse.json({ success: true, updated: result.count })
    }

    // ── Export payments as CSV ────────────────────────────────────────────────
    if (action === 'export-payments-csv') {
      const { from, to, status, propertyId } = body
      const where: any = {}
      if (from && to) where.paymentDate = { gte: new Date(from), lte: new Date(to) }
      if (status && status !== 'all') where.status = status
      if (propertyId && propertyId !== 'all') where.tenants = { units: { propertyId } }

      const payments = await prisma.payments.findMany({
        where,
        include: {
          tenants: {
            include: {
              users: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
              units: { select: { unitNumber: true, properties: { select: { name: true } } } },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        take: 5000,
      })

      const headers = ['Date', 'Reference', 'Tenant', 'Email', 'Phone', 'Property', 'Unit', 'Type', 'Method', 'Amount', 'Status', 'Verification']
      const rows = payments.map((p) => [
        new Date(p.paymentDate).toLocaleDateString('en-KE'),
        p.referenceNumber,
        `${p.tenants.users.firstName} ${p.tenants.users.lastName}`,
        p.tenants.users.email,
        p.tenants.users.phoneNumber ?? '',
        p.tenants.units.properties.name,
        p.tenants.units.unitNumber,
        p.paymentType,
        p.paymentMethod,
        Number(p.amount).toFixed(2),
        p.status,
        p.verificationStatus,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`))

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payments-${Date.now()}.csv"`,
        },
      })
    }

    // ── Export arrears as CSV ─────────────────────────────────────────────────
    if (action === 'export-arrears-csv') {
      const bills = await prisma.monthly_bills.findMany({
        where: { status: { in: ['OVERDUE', 'UNPAID', 'PENDING'] }, dueDate: { lt: new Date() } },
        include: {
          tenants: {
            include: {
              users: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
              units: { select: { unitNumber: true, properties: { select: { name: true } } } },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      })

      const headers = ['Month', 'Due Date', 'Tenant', 'Email', 'Phone', 'Property', 'Unit', 'Rent', 'Water', 'Garbage', 'Total', 'Status', 'Days Overdue']
      const rows = bills.map((b) => {
        const daysOverdue = Math.floor((Date.now() - new Date(b.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        return [
          new Date(b.month).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' }),
          new Date(b.dueDate).toLocaleDateString('en-KE'),
          `${b.tenants.users.firstName} ${b.tenants.users.lastName}`,
          b.tenants.users.email,
          b.tenants.users.phoneNumber ?? '',
          b.tenants.units.properties.name,
          b.tenants.units.unitNumber,
          Number(b.rentAmount).toFixed(2),
          Number(b.waterAmount).toFixed(2),
          Number(b.garbageAmount).toFixed(2),
          Number(b.totalAmount).toFixed(2),
          b.status,
          daysOverdue,
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`)
      })

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="arrears-${Date.now()}.csv"`,
        },
      })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err: any) {
    console.error('[BULK]', err?.message)
    return NextResponse.json({ error: 'Bulk operation failed' }, { status: 500 })
  }
}
