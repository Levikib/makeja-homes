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

    const db = getPrismaForRequest(request)
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [propsRes, unitsRes, tenantsRes, occupiedRes, maintRes, overdueRes, revenueRes] = await Promise.all([
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM properties WHERE "deletedAt" IS NULL`),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM units WHERE "deletedAt" IS NULL`),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM users WHERE role = 'TENANT' AND "isActive" = true`),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM units WHERE status = 'OCCUPIED' AND "deletedAt" IS NULL`),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM maintenance_requests WHERE status IN ('PENDING','ASSIGNED','IN_PROGRESS')`).catch(() => [{ c: 0 }]),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM monthly_bills WHERE status = 'OVERDUE'`).catch(() => [{ c: 0 }]),
      db.$queryRawUnsafe<any[]>(
        `SELECT COALESCE(SUM(amount),0) as total, COUNT(*)::int as cnt FROM payments WHERE status = 'COMPLETED' AND "verificationStatus" = 'APPROVED' AND "paidAt" >= $1`,
        thisMonthStart
      ).catch(() => [{ total: 0, cnt: 0 }]),
    ])

    const totalProperties = propsRes[0]?.c ?? 0
    const totalUnits = unitsRes[0]?.c ?? 0
    const totalTenants = tenantsRes[0]?.c ?? 0
    const occupiedUnits = occupiedRes[0]?.c ?? 0
    const openMaintenance = maintRes[0]?.c ?? 0
    const overdueCount = overdueRes[0]?.c ?? 0
    const thisMonthRevenue = Number(revenueRes[0]?.total ?? 0)
    const paymentsCount = revenueRes[0]?.cnt ?? 0
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

    // Monthly revenue for last 6 months
    const revenueData: { month: string; revenue: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = d
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const [rev, exp] = await Promise.all([
        db.$queryRawUnsafe<any[]>(
          `SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status = 'COMPLETED' AND "verificationStatus" = 'APPROVED' AND "paidAt" >= $1 AND "paidAt" < $2`,
          start, end
        ).catch(() => [{ total: 0 }]),
        db.$queryRawUnsafe<any[]>(
          `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date >= $1 AND date < $2`,
          start, end
        ).catch(() => [{ total: 0 }]),
      ])
      revenueData.push({
        month: d.toLocaleString("en-KE", { month: "short" }),
        revenue: Number(rev[0]?.total ?? 0),
        expenses: Number(exp[0]?.total ?? 0),
      })
    }

    // Company name from master DB
    let companyName = "Dashboard"
    try {
      const companyId = (currentUser as any).companyId
      if (companyId) {
        const master = getMasterPrisma()
        const rows = await master.$queryRawUnsafe<any[]>(`SELECT name FROM companies WHERE id = $1 LIMIT 1`, companyId)
        if (rows[0]?.name) companyName = rows[0].name
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
      paymentsCount,
      totalRevenue: thisMonthRevenue,
      revenueData,
    })

  } catch (error: any) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats", details: error.message }, { status: 500 })
  }
}
