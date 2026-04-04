import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'
import {
  calculateMriTax,
  calculatePropertyMri,
  calculateStampDuty,
  calculateLandRate,
  calculateContractorWht,
} from '@/lib/kenya-tax'

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
    const type = searchParams.get('type') || 'summary'
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))

    const prisma = getPrismaForRequest(request)

    if (type === 'summary') {
      // Aggregate MRI tax across all active leases
      const properties = await prisma.properties.findMany({
        where: { deletedAt: null },
        select: {
          id: true, name: true, city: true,
          units: {
            where: { status: 'OCCUPIED', deletedAt: null },
            select: { id: true, unitNumber: true, rentAmount: true },
          },
        },
      })

      // Expenses for WHT calculation (maintenance costs paid to contractors)
      const yearStart = new Date(year, 0, 1)
      const yearEnd = new Date(year + 1, 0, 1)
      const maintenanceExpenses = await prisma.expenses.findMany({
        where: {
          category: { in: ['MAINTENANCE', 'REPAIRS', 'CONTRACTOR'] },
          createdAt: { gte: yearStart, lt: yearEnd },
        },
        select: { amount: true, description: true, category: true },
      })

      // Payments (gross rent collected this year)
      const paymentsThisYear = await prisma.payments.aggregate({
        where: {
          status: 'COMPLETED',
          verificationStatus: 'APPROVED',
          paymentType: 'RENT',
          paymentDate: { gte: yearStart, lt: yearEnd },
        },
        _sum: { amount: true },
      })

      const grossRentCollected = Number(paymentsThisYear._sum.amount ?? 0)

      // Per-property MRI summary
      const propertySummaries = properties.map((prop) =>
        calculatePropertyMri(
          prop.name,
          prop.id,
          prop.units.map((u) => ({ monthlyRent: Number(u.rentAmount) }))
        )
      )

      const totalMonthlyMri = propertySummaries.reduce((s, p) => s + p.totalMonthlyTax, 0)
      const totalAnnualMri = propertySummaries.reduce((s, p) => s + p.totalAnnualTax, 0)

      // Contractor WHT
      const totalContractorPayments = maintenanceExpenses.reduce(
        (s, e) => s + Number(e.amount), 0
      )
      const contractorWht = Math.round(totalContractorPayments * 0.03)

      return NextResponse.json({
        year,
        grossRentCollected,
        mriTax: {
          monthlyTotal: Math.round(totalMonthlyMri),
          annualProjected: Math.round(totalAnnualMri),
          propertySummaries,
        },
        contractorWht: {
          totalContractorPayments: Math.round(totalContractorPayments),
          whtOwed: contractorWht,
          netPayable: Math.round(totalContractorPayments - contractorWht),
        },
        totalTaxLiability: totalAnnualMri + contractorWht,
        netIncomeAfterTax: grossRentCollected - totalAnnualMri - contractorWht,
      })
    }

    if (type === 'mri-monthly') {
      // Monthly MRI breakdown for a specific month
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 1)

      const activeLeases = await prisma.lease_agreements.findMany({
        where: { status: 'ACTIVE' },
        include: {
          tenants: {
            include: {
              users: { select: { firstName: true, lastName: true } },
              units: { select: { unitNumber: true, properties: { select: { name: true, city: true } } } },
            },
          },
        },
      })

      const leaseBreakdown = activeLeases.map((lease) => {
        const mri = calculateMriTax(Number(lease.rentAmount))
        return {
          leaseId: lease.id,
          tenant: `${lease.tenants.users.firstName} ${lease.tenants.users.lastName}`,
          unit: lease.tenants.units.unitNumber,
          property: lease.tenants.units.properties.name,
          city: lease.tenants.units.properties.city,
          monthlyRent: Number(lease.rentAmount),
          mriTaxApplicable: mri.mriTaxApplicable,
          monthlyMriTax: mri.monthlyTax,
          netRent: mri.netMonthlyRent,
        }
      })

      const totalMri = leaseBreakdown.reduce((s, l) => s + l.monthlyMriTax, 0)

      return NextResponse.json({
        year, month,
        leases: leaseBreakdown,
        summary: {
          totalLeases: leaseBreakdown.length,
          taxableLeases: leaseBreakdown.filter((l) => l.mriTaxApplicable).length,
          totalMonthlyRent: leaseBreakdown.reduce((s, l) => s + l.monthlyRent, 0),
          totalMriTax: Math.round(totalMri),
          totalNetRent: leaseBreakdown.reduce((s, l) => s + l.netRent, 0),
        },
      })
    }

    if (type === 'stamp-duty') {
      // All active leases with stamp duty calculation
      const leases = await prisma.lease_agreements.findMany({
        where: { status: { in: ['ACTIVE', 'PENDING'] } },
        include: {
          tenants: {
            include: {
              users: { select: { firstName: true, lastName: true } },
              units: { select: { unitNumber: true, properties: { select: { name: true } } } },
            },
          },
        },
      })

      const leaseStampDuty = leases.map((lease) => {
        const durationMonths = Math.round(
          (new Date(lease.endDate).getTime() - new Date(lease.startDate).getTime()) /
          (1000 * 60 * 60 * 24 * 30)
        )
        const sd = calculateStampDuty(Number(lease.rentAmount), durationMonths)
        return {
          leaseId: lease.id,
          tenant: `${lease.tenants.users.firstName} ${lease.tenants.users.lastName}`,
          unit: lease.tenants.units.unitNumber,
          property: lease.tenants.units.properties.name,
          monthlyRent: Number(lease.rentAmount),
          durationMonths,
          stampDutyRate: sd.stampDutyRate,
          stampDutyAmount: sd.stampDutyAmount,
          startDate: lease.startDate,
          endDate: lease.endDate,
        }
      })

      return NextResponse.json({
        leases: leaseStampDuty,
        totalStampDuty: leaseStampDuty.reduce((s, l) => s + l.stampDutyAmount, 0),
      })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (err: any) {
    console.error('[TAX API]', err?.message)
    return NextResponse.json({ error: 'Failed to calculate tax' }, { status: 500 })
  }
}
