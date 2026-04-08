import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getPrismaForRequest } from '@/lib/get-prisma'
import {
  calculateMriTax,
  calculatePropertyMri,
  calculateStampDuty,
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

    const db = getPrismaForRequest(request)

    if (type === 'summary') {
      const yearStart = new Date(year, 0, 1).toISOString()
      const yearEnd = new Date(year + 1, 0, 1).toISOString()

      // Properties with their occupied units
      const propertyRows = await db.$queryRawUnsafe<any[]>(
        `SELECT p.id AS "propertyId", p.name AS "propertyName", p.city,
                u.id AS "unitId", u."unitNumber", u."rentAmount"
         FROM properties p
         LEFT JOIN units u ON u."propertyId" = p.id
           AND u.status::text = 'OCCUPIED'
           AND u."deletedAt" IS NULL
         WHERE p."deletedAt" IS NULL
         ORDER BY p.id`
      )

      // Group into properties
      const propMap = new Map<string, { id: string; name: string; city: string; units: any[] }>()
      for (const row of propertyRows) {
        if (!propMap.has(row.propertyId)) {
          propMap.set(row.propertyId, { id: row.propertyId, name: row.propertyName, city: row.city, units: [] })
        }
        if (row.unitId) {
          propMap.get(row.propertyId)!.units.push({ monthlyRent: Number(row.rentAmount) })
        }
      }
      const properties = Array.from(propMap.values())

      // Maintenance expenses for WHT
      const expenseRows = await db.$queryRawUnsafe<any[]>(
        `SELECT amount, description, category
         FROM expenses
         WHERE category IN ('MAINTENANCE', 'REPAIRS', 'CONTRACTOR')
           AND "createdAt" >= $1 AND "createdAt" < $2`,
        yearStart,
        yearEnd
      )

      // Gross rent collected this year
      const revenueRows = await db.$queryRawUnsafe<{ total: string }[]>(
        `SELECT COALESCE(SUM(amount), 0)::text AS total
         FROM payments
         WHERE status::text = 'COMPLETED'
           AND "verificationStatus"::text = 'APPROVED'
           AND "paymentType"::text = 'RENT'
           AND "paymentDate" >= $1 AND "paymentDate" < $2`,
        yearStart,
        yearEnd
      )
      const grossRentCollected = Number(revenueRows[0]?.total ?? 0)

      // Per-property MRI
      const propertySummaries = properties.map((prop) =>
        calculatePropertyMri(prop.name, prop.id, prop.units)
      )

      const totalMonthlyMri = propertySummaries.reduce((s, p) => s + p.totalMonthlyTax, 0)
      const totalAnnualMri = propertySummaries.reduce((s, p) => s + p.totalAnnualTax, 0)

      const totalContractorPayments = expenseRows.reduce((s, e) => s + Number(e.amount), 0)
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
      const leaseRows = await db.$queryRawUnsafe<any[]>(
        `SELECT la.id AS "leaseId", la."rentAmount",
                u."firstName", u."lastName",
                un."unitNumber",
                p.name AS "propertyName", p.city
         FROM lease_agreements la
         JOIN tenants t ON t.id = la."tenantId"
         JOIN users u ON u.id = t."userId"
         JOIN units un ON un.id = t."unitId"
         JOIN properties p ON p.id = un."propertyId"
         WHERE la.status::text = 'ACTIVE'`
      )

      const leaseBreakdown = leaseRows.map((lease) => {
        const mri = calculateMriTax(Number(lease.rentAmount))
        return {
          leaseId: lease.leaseId,
          tenant: `${lease.firstName} ${lease.lastName}`,
          unit: lease.unitNumber,
          property: lease.propertyName,
          city: lease.city,
          monthlyRent: Number(lease.rentAmount),
          mriTaxApplicable: mri.mriTaxApplicable,
          monthlyMriTax: mri.monthlyTax,
          netRent: mri.netMonthlyRent,
        }
      })

      const totalMri = leaseBreakdown.reduce((s, l) => s + l.monthlyMriTax, 0)

      return NextResponse.json({
        year,
        month,
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
      const leaseRows = await db.$queryRawUnsafe<any[]>(
        `SELECT la.id AS "leaseId", la."rentAmount", la."startDate", la."endDate",
                u."firstName", u."lastName",
                un."unitNumber",
                p.name AS "propertyName"
         FROM lease_agreements la
         JOIN tenants t ON t.id = la."tenantId"
         JOIN users u ON u.id = t."userId"
         JOIN units un ON un.id = t."unitId"
         JOIN properties p ON p.id = un."propertyId"
         WHERE la.status::text IN ('ACTIVE', 'PENDING')`
      )

      const leaseStampDuty = leaseRows.map((lease) => {
        const durationMonths = Math.round(
          (new Date(lease.endDate).getTime() - new Date(lease.startDate).getTime()) /
          (1000 * 60 * 60 * 24 * 30)
        )
        const sd = calculateStampDuty(Number(lease.rentAmount), durationMonths)
        return {
          leaseId: lease.leaseId,
          tenant: `${lease.firstName} ${lease.lastName}`,
          unit: lease.unitNumber,
          property: lease.propertyName,
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
