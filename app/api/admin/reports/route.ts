import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!['ADMIN', 'MANAGER'].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const toDate = to ? new Date(to) : new Date()

    const db = getPrismaForRequest(request)

    if (type === 'overview') {
      const [
        propRows, unitRows, occupiedRows, tenantRows,
        revenueRows, overdueRows, pendingRows,
        monthlyRevenueRows, expenseRows,
      ] = await Promise.all([
        db.$queryRawUnsafe<{ cnt: string }[]>(
          `SELECT COUNT(*)::text AS cnt FROM properties WHERE "deletedAt" IS NULL`
        ),
        db.$queryRawUnsafe<{ cnt: string }[]>(
          `SELECT COUNT(*)::text AS cnt FROM units WHERE "deletedAt" IS NULL`
        ),
        db.$queryRawUnsafe<{ cnt: string }[]>(
          `SELECT COUNT(*)::text AS cnt FROM units WHERE status::text = 'OCCUPIED' AND "deletedAt" IS NULL`
        ),
        db.$queryRawUnsafe<{ cnt: string }[]>(
          `SELECT COUNT(*)::text AS cnt FROM tenants`
        ),
        db.$queryRawUnsafe<{ total: string; cnt: string }[]>(
          `SELECT COALESCE(SUM(amount), 0)::text AS total, COUNT(*)::text AS cnt
           FROM payments
           WHERE status::text = 'COMPLETED'
             AND "verificationStatus"::text = 'APPROVED'
             AND "paymentDate" >= $1 AND "paymentDate" <= $2`,
          fromDate.toISOString(),
          toDate.toISOString()
        ),
        db.$queryRawUnsafe<{ cnt: string }[]>(
          `SELECT COUNT(*)::text AS cnt FROM monthly_bills WHERE status = 'OVERDUE'`
        ),
        db.$queryRawUnsafe<{ cnt: string }[]>(
          `SELECT COUNT(*)::text AS cnt FROM payments WHERE "verificationStatus"::text = 'PENDING'`
        ),
        db.$queryRawUnsafe<{ month: string; total: string }[]>(
          `SELECT DATE_TRUNC('month', "paymentDate")::text AS month,
                  SUM(amount)::text AS total
           FROM payments
           WHERE status::text = 'COMPLETED'
             AND "verificationStatus"::text = 'APPROVED'
             AND "paymentDate" >= NOW() - INTERVAL '6 months'
           GROUP BY DATE_TRUNC('month', "paymentDate")
           ORDER BY month ASC`
        ),
        db.$queryRawUnsafe<{ total: string }[]>(
          `SELECT COALESCE(SUM(amount), 0)::text AS total
           FROM expenses
           WHERE "createdAt" >= $1 AND "createdAt" <= $2`,
          fromDate.toISOString(),
          toDate.toISOString()
        ),
      ])

      const totalProperties = Number(propRows[0]?.cnt ?? 0)
      const totalUnits = Number(unitRows[0]?.cnt ?? 0)
      const occupiedUnits = Number(occupiedRows[0]?.cnt ?? 0)
      const totalTenants = Number(tenantRows[0]?.cnt ?? 0)
      const totalRevenue = Number(revenueRows[0]?.total ?? 0)
      const totalPaymentsCount = Number(revenueRows[0]?.cnt ?? 0)
      const overdueCount = Number(overdueRows[0]?.cnt ?? 0)
      const pendingVerification = Number(pendingRows[0]?.cnt ?? 0)
      const totalExpenses = Number(expenseRows[0]?.total ?? 0)

      const vacancyRate = totalUnits > 0
        ? Math.round(((totalUnits - occupiedUnits) / totalUnits) * 100)
        : 0

      return NextResponse.json({
        overview: {
          totalProperties,
          totalUnits,
          occupiedUnits,
          vacantUnits: totalUnits - occupiedUnits,
          occupancyRate: 100 - vacancyRate,
          vacancyRate,
          totalTenants,
          totalRevenue,
          totalPayments: totalPaymentsCount,
          totalExpenses,
          overdueCount,
          pendingVerification,
          netIncome: totalRevenue - totalExpenses,
        },
        monthlyRevenue: monthlyRevenueRows.map((r) => ({
          month: new Date(r.month).toLocaleString('en-KE', { month: 'short', year: 'numeric' }),
          revenue: Number(r.total),
        })),
        dateRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
      })
    }

    if (type === 'payments') {
      const rows = await db.$queryRawUnsafe<any[]>(
        `SELECT p.id, p."referenceNumber", p.amount, p."paymentMethod"::text AS "paymentMethod",
                p."paymentType"::text AS "paymentType", p."paymentDate",
                u."firstName", u."lastName",
                un."unitNumber",
                pr.name AS "propertyName"
         FROM payments p
         JOIN tenants t ON t.id = p."tenantId"
         JOIN users u ON u.id = t."userId"
         JOIN units un ON un.id = t."unitId"
         JOIN properties pr ON pr.id = un."propertyId"
         WHERE p."paymentDate" >= $1 AND p."paymentDate" <= $2
           AND p.status::text = 'COMPLETED'
         ORDER BY p."paymentDate" DESC
         LIMIT 500`,
        fromDate.toISOString(),
        toDate.toISOString()
      )

      const byMethod: Record<string, number> = {}
      const byType: Record<string, number> = {}
      let totalSum = 0

      for (const p of rows) {
        const amt = Number(p.amount)
        totalSum += amt
        byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] ?? 0) + amt
        byType[p.paymentType] = (byType[p.paymentType] ?? 0) + amt
      }

      return NextResponse.json({
        payments: rows.map((p) => ({
          id: p.id,
          referenceNumber: p.referenceNumber,
          amount: Number(p.amount),
          paymentMethod: p.paymentMethod,
          paymentType: p.paymentType,
          paymentDate: p.paymentDate,
          tenant: `${p.firstName} ${p.lastName}`,
          unit: p.unitNumber,
          property: p.propertyName,
        })),
        summary: {
          total: totalSum,
          count: rows.length,
          byMethod,
          byType,
        },
        dateRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
      })
    }

    if (type === 'occupancy') {
      const rows = await db.$queryRawUnsafe<any[]>(
        `SELECT p.id AS "propertyId", p.name AS "propertyName", p.city,
                u.id AS "unitId", u."unitNumber", u.status::text AS status,
                u."rentAmount", u.type::text AS type
         FROM properties p
         LEFT JOIN units u ON u."propertyId" = p.id AND u."deletedAt" IS NULL
         WHERE p."deletedAt" IS NULL
         ORDER BY p.id, u."unitNumber"`
      )

      // Group into properties
      const propMap = new Map<string, {
        id: string; name: string; city: string
        units: { id: string; unitNumber: string; status: string; rentAmount: number; type: string }[]
      }>()
      for (const row of rows) {
        if (!propMap.has(row.propertyId)) {
          propMap.set(row.propertyId, { id: row.propertyId, name: row.propertyName, city: row.city, units: [] })
        }
        if (row.unitId) {
          propMap.get(row.propertyId)!.units.push({
            id: row.unitId,
            unitNumber: row.unitNumber,
            status: row.status,
            rentAmount: Number(row.rentAmount),
            type: row.type,
          })
        }
      }

      const properties = Array.from(propMap.values()).map((prop) => {
        const total = prop.units.length
        const occupied = prop.units.filter((u) => u.status === 'OCCUPIED').length
        const vacant = total - occupied
        const potentialRevenue = prop.units.reduce((s, u) => s + u.rentAmount, 0)
        const actualRevenue = prop.units
          .filter((u) => u.status === 'OCCUPIED')
          .reduce((s, u) => s + u.rentAmount, 0)
        return {
          id: prop.id,
          name: prop.name,
          city: prop.city,
          totalUnits: total,
          occupied,
          vacant,
          occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
          potentialRevenue,
          actualRevenue,
          units: prop.units,
        }
      })

      return NextResponse.json({ properties })
    }

    if (type === 'arrears') {
      const rows = await db.$queryRawUnsafe<any[]>(
        `SELECT mb.id, mb.month, mb."dueDate", mb."totalAmount", mb.status,
                u."firstName", u."lastName", u.email, u."phoneNumber",
                un."unitNumber",
                p.name AS "propertyName"
         FROM monthly_bills mb
         JOIN tenants t ON t.id = mb."tenantId"
         JOIN users u ON u.id = t."userId"
         JOIN units un ON un.id = t."unitId"
         JOIN properties p ON p.id = un."propertyId"
         WHERE mb.status IN ('OVERDUE', 'UNPAID', 'PENDING')
           AND mb."dueDate" < NOW()
         ORDER BY mb."dueDate" ASC`
      )

      const totalArrears = rows.reduce((s, b) => s + Number(b.totalAmount), 0)

      return NextResponse.json({
        arrears: rows.map((b) => ({
          id: b.id,
          month: b.month,
          dueDate: b.dueDate,
          totalAmount: Number(b.totalAmount),
          status: b.status,
          daysOverdue: Math.floor((Date.now() - new Date(b.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
          tenant: `${b.firstName} ${b.lastName}`,
          email: b.email,
          phone: b.phoneNumber,
          unit: b.unitNumber,
          property: b.propertyName,
        })),
        summary: {
          totalArrears,
          count: rows.length,
        },
      })
    }

    if (type === 'expenses') {
      const rows = await db.$queryRawUnsafe<any[]>(
        `SELECT e.id, e.description, e.amount, e.category, e."createdAt",
                p.name AS "propertyName"
         FROM expenses e
         LEFT JOIN properties p ON p.id = e."propertyId"
         WHERE e."createdAt" >= $1 AND e."createdAt" <= $2
         ORDER BY e."createdAt" DESC
         LIMIT 500`,
        fromDate.toISOString(),
        toDate.toISOString()
      )

      const byCategory: Record<string, number> = {}
      let totalSum = 0

      for (const e of rows) {
        const amt = Number(e.amount)
        totalSum += amt
        const cat = e.category ?? 'Other'
        byCategory[cat] = (byCategory[cat] ?? 0) + amt
      }

      return NextResponse.json({
        expenses: rows.map((e) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          category: e.category,
          date: e.createdAt,
          property: e.propertyName ?? '—',
        })),
        summary: {
          total: totalSum,
          count: rows.length,
          byCategory,
        },
        dateRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
      })
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  } catch (err: any) {
    console.error('[REPORTS]', err?.message)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
