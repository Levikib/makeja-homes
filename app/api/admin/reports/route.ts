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

    const prisma = getPrismaForRequest(request)

    if (type === 'overview') {
      const [
        totalProperties, totalUnits, occupiedUnits, totalTenants,
        paymentsInRange, overdueCount, pendingVerification,
        monthlyRevenue, expensesInRange,
      ] = await Promise.all([
        prisma.properties.count({ where: { deletedAt: null } }),
        prisma.units.count({ where: { deletedAt: null } }),
        prisma.units.count({ where: { status: 'OCCUPIED', deletedAt: null } }),
        prisma.tenants.count(),
        prisma.payments.aggregate({
          where: {
            status: 'COMPLETED',
            verificationStatus: 'APPROVED',
            paymentDate: { gte: fromDate, lte: toDate },
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.monthly_bills.count({ where: { status: 'OVERDUE' } }),
        prisma.payments.count({ where: { verificationStatus: 'PENDING' } }),
        // Last 6 months revenue
        prisma.$queryRaw<{ month: Date; total: number }[]>`
          SELECT DATE_TRUNC('month', "paymentDate") as month, SUM(amount) as total
          FROM payments
          WHERE status = 'COMPLETED' AND "verificationStatus" = 'APPROVED'
            AND "paymentDate" >= NOW() - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', "paymentDate")
          ORDER BY month ASC
        `,
        prisma.expenses.aggregate({
          where: { createdAt: { gte: fromDate, lte: toDate } },
          _sum: { amount: true },
        }),
      ])

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
          totalRevenue: Number(paymentsInRange._sum.amount ?? 0),
          totalPayments: paymentsInRange._count,
          totalExpenses: Number(expensesInRange._sum.amount ?? 0),
          overdueCount,
          pendingVerification,
          netIncome: Number(paymentsInRange._sum.amount ?? 0) - Number(expensesInRange._sum.amount ?? 0),
        },
        monthlyRevenue: (monthlyRevenue as any[]).map((r) => ({
          month: new Date(r.month).toLocaleString('en-KE', { month: 'short', year: 'numeric' }),
          revenue: Number(r.total),
        })),
        dateRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
      })
    }

    if (type === 'payments') {
      const payments = await prisma.payments.findMany({
        where: {
          paymentDate: { gte: fromDate, lte: toDate },
          status: 'COMPLETED',
        },
        include: {
          tenants: {
            include: {
              users: { select: { firstName: true, lastName: true } },
              units: { select: { unitNumber: true, properties: { select: { name: true } } } },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        take: 500,
      })

      const byMethod = payments.reduce((acc: Record<string, number>, p) => {
        const m = p.paymentMethod
        acc[m] = (acc[m] ?? 0) + Number(p.amount)
        return acc
      }, {})

      const byType = payments.reduce((acc: Record<string, number>, p) => {
        const t = p.paymentType
        acc[t] = (acc[t] ?? 0) + Number(p.amount)
        return acc
      }, {})

      return NextResponse.json({
        payments: payments.map((p) => ({
          id: p.id,
          referenceNumber: p.referenceNumber,
          amount: Number(p.amount),
          paymentMethod: p.paymentMethod,
          paymentType: p.paymentType,
          paymentDate: p.paymentDate,
          tenant: `${p.tenants.users.firstName} ${p.tenants.users.lastName}`,
          unit: p.tenants.units.unitNumber,
          property: p.tenants.units.properties.name,
        })),
        summary: {
          total: payments.reduce((s, p) => s + Number(p.amount), 0),
          count: payments.length,
          byMethod,
          byType,
        },
        dateRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
      })
    }

    if (type === 'occupancy') {
      const properties = await prisma.properties.findMany({
        where: { deletedAt: null },
        select: {
          id: true, name: true, city: true,
          units: {
            where: { deletedAt: null },
            select: { id: true, unitNumber: true, status: true, rentAmount: true, type: true },
          },
        },
      })

      return NextResponse.json({
        properties: properties.map((prop) => {
          const total = prop.units.length
          const occupied = prop.units.filter((u) => u.status === 'OCCUPIED').length
          const vacant = total - occupied
          const potentialRevenue = prop.units.reduce((s, u) => s + Number(u.rentAmount), 0)
          const actualRevenue = prop.units
            .filter((u) => u.status === 'OCCUPIED')
            .reduce((s, u) => s + Number(u.rentAmount), 0)
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
        }),
      })
    }

    if (type === 'arrears') {
      const overdueBills = await prisma.monthly_bills.findMany({
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

      const totalArrears = overdueBills.reduce((s, b) => s + Number(b.totalAmount), 0)

      return NextResponse.json({
        arrears: overdueBills.map((b) => ({
          id: b.id,
          month: b.month,
          dueDate: b.dueDate,
          totalAmount: Number(b.totalAmount),
          status: b.status,
          daysOverdue: Math.floor((Date.now() - new Date(b.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
          tenant: `${b.tenants.users.firstName} ${b.tenants.users.lastName}`,
          email: b.tenants.users.email,
          phone: b.tenants.users.phoneNumber,
          unit: b.tenants.units.unitNumber,
          property: b.tenants.units.properties.name,
        })),
        summary: {
          totalArrears,
          count: overdueBills.length,
        },
      })
    }

    if (type === 'expenses') {
      const expenses = await prisma.expenses.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: { properties: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })

      const byCategory = expenses.reduce((acc: Record<string, number>, e) => {
        const cat = e.category ?? 'Other'
        acc[cat] = (acc[cat] ?? 0) + Number(e.amount)
        return acc
      }, {})

      return NextResponse.json({
        expenses: expenses.map((e) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          category: e.category,
          date: e.createdAt,
          property: e.properties?.name ?? '—',
        })),
        summary: {
          total: expenses.reduce((s, e) => s + Number(e.amount), 0),
          count: expenses.length,
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
