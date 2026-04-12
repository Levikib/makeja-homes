/**
 * POST /api/integrations/quickbooks/sync
 * Manually trigger a sync of recent payments and expenses to QuickBooks.
 *
 * Body: { type: 'payments' | 'expenses' | 'all', days?: number }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromRequest } from '@/lib/auth-helpers'
import { getIntegration } from '@/lib/integrations'
import { syncPaymentToQBO, syncExpenseToQBO, type QBOConfig } from '@/lib/integrations/quickbooks'
import { getPrismaForRequest, resolveSchema } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const slug = resolveSchema(req).replace('tenant_', '')
  const config = await getIntegration(slug, 'quickbooks')
  if (!config?.enabled) {
    return NextResponse.json({ error: 'QuickBooks integration is not enabled' }, { status: 400 })
  }

  const qbo = config.settings as QBOConfig
  const db = getPrismaForRequest(req)
  const { type = 'all', days = 30 } = await req.json()

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const results = { payments: { synced: 0, failed: 0, errors: [] as string[] }, expenses: { synced: 0, failed: 0, errors: [] as string[] } }

  // ── Sync payments
  if (type === 'payments' || type === 'all') {
    const payments = await db.$queryRawUnsafe<any[]>(`
      SELECT
        p.id, p."referenceNumber", p.amount, p."paymentDate", p."paymentMethod", p.notes,
        p."tenantId",
        u.name as "tenantName",
        un.number as "unitNumber",
        pr.name as "propertyName"
      FROM payments p
      JOIN tenants t ON t.id = p."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = p."unitId"
      JOIN properties pr ON pr.id = un."propertyId"
      WHERE p.status = 'COMPLETED'
        AND p."createdAt" > $1
        AND p."deletedAt" IS NULL
      ORDER BY p."paymentDate" DESC
      LIMIT 200
    `, since)

    for (const p of payments) {
      try {
        await syncPaymentToQBO(qbo, {
          id: p.id,
          referenceNumber: p.referenceNumber,
          amount: p.amount,
          paymentDate: p.paymentDate,
          paymentMethod: p.paymentMethod,
          tenantName: p.tenantName,
          tenantId: p.tenantId,
          unitNumber: p.unitNumber,
          propertyName: p.propertyName,
          notes: p.notes,
        })
        results.payments.synced++
      } catch (e: any) {
        results.payments.failed++
        results.payments.errors.push(`${p.referenceNumber}: ${e.message}`)
      }
    }
  }

  // ── Sync expenses
  if (type === 'expenses' || type === 'all') {
    const expenses = await db.$queryRawUnsafe<any[]>(`
      SELECT
        e.id, e.amount, e.category, e.description, e.date, e."paymentMethod",
        p.name as "propertyName"
      FROM expenses e
      JOIN properties p ON p.id = e."propertyId"
      WHERE e."createdAt" > $1
      ORDER BY e.date DESC
      LIMIT 200
    `, since)

    for (const e of expenses) {
      try {
        await syncExpenseToQBO(qbo, {
          id: e.id,
          amount: parseFloat(e.amount),
          category: e.category,
          description: e.description,
          date: e.date,
          paymentMethod: e.paymentMethod,
          propertyName: e.propertyName,
        })
        results.expenses.synced++
      } catch (err: any) {
        results.expenses.failed++
        results.expenses.errors.push(`${e.description}: ${err.message}`)
      }
    }
  }

  return NextResponse.json({ success: true, results, syncedAt: new Date().toISOString() })
}
