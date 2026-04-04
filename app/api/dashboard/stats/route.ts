import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserFromRequest } from "@/lib/auth-helpers"
import { getPrismaForRequest, getMasterPrisma } from "@/lib/get-prisma"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prisma = getPrismaForRequest(request)
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalProperties, totalUnits, totalTenants, occupiedUnits, openMaintenance, overdueCount, thisMonthPayments] = await Promise.all([
      prisma.properties.count({ where: { deletedAt: null } }),
      prisma.units.count({ where: { deletedAt: null } }),
      prisma.users.count({ where: { role: "TENANT", isActive: true } }),
      prisma.units.count({ where: { status: "OCCUPIED", deletedAt: null } }),
      prisma.maintenance_requests.count({ where: { status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] } } }),
      prisma.monthly_bills.count({ where: { status: "OVERDUE" } }).catch(() => 0),
      prisma.payments.aggregate({
        where: { status: "COMPLETED", verificationStatus: "APPROVED", paymentDate: { gte: thisMonthStart } },
        _sum: { amount: true }, _count: true,
      }),
    ])

    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
    const thisMonthRevenue = Number(thisMonthPayments._sum.amount ?? 0)

    // Monthly revenue for last 6 months (real data)
    const revenueData: { month: string; revenue: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = d
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const [rev, exp] = await Promise.all([
        prisma.payments.aggregate({
          where: { status: "COMPLETED", verificationStatus: "APPROVED", paymentDate: { gte: start, lt: end } },
          _sum: { amount: true },
        }),
        prisma.expenses.aggregate({
          where: { date: { gte: start, lt: end } },
          _sum: { amount: true },
        }).catch(() => ({ _sum: { amount: null } })),
      ])
      revenueData.push({
        month: d.toLocaleString("en-KE", { month: "short" }),
        revenue: Number(rev._sum.amount ?? 0),
        expenses: Number(exp._sum.amount ?? 0),
      })
    }

    // Company name from master DB
    let companyName = "Dashboard"
    try {
      const companyId = (currentUser as any).companyId
      if (companyId) {
        const master = getMasterPrisma()
        const company = await master.companies.findUnique({ where: { id: companyId }, select: { name: true } })
        if (company?.name) companyName = company.name
      }
    } catch {}

    return NextResponse.json({
      companyName,
      totalProperties,
      totalUnits,
      totalTenants,
      occupancyRate,
      occupiedUnits,
      openMaintenance,
      overdueCount,
      thisMonthRevenue,
      paymentsCount: thisMonthPayments._count,
      totalRevenue: thisMonthRevenue,
      revenueData,
    })

  } catch (error: any) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats", details: error.message }, { status: 500 })
  }
}
