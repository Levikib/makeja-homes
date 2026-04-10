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
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const [
      propsRes, unitsRes, tenantsRes, occupiedRes, vacantRes, reservedRes,
      maintRes, overdueRes, pendingBillsRes,
      revenueRes, pendingPaymentsRes, expiringleasesRes,
      thisMonthBillsRes,
    ] = await Promise.all([
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM properties WHERE "deletedAt" IS NULL`),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM units WHERE "deletedAt" IS NULL`),
      db.$queryRawUnsafe<any[]>(`
        SELECT COUNT(*)::int as c FROM tenants t
        JOIN units u ON u.id = t."unitId"
        WHERE u.status::text = 'OCCUPIED'
      `),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM units WHERE status::text = 'OCCUPIED' AND "deletedAt" IS NULL`),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM units WHERE status::text = 'VACANT' AND "deletedAt" IS NULL`),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM units WHERE status::text = 'RESERVED' AND "deletedAt" IS NULL`),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM maintenance_requests WHERE status::text IN ('PENDING','ASSIGNED','IN_PROGRESS')`).catch(() => [{ c: 0 }]),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM monthly_bills WHERE status::text IN ('OVERDUE','UNPAID')`).catch(() => [{ c: 0 }]),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM monthly_bills WHERE status::text = 'PENDING'`).catch(() => [{ c: 0 }]),
      // Revenue: use paymentDate (not paidAt)
      db.$queryRawUnsafe<any[]>(
        `SELECT COALESCE(SUM(amount),0) as total, COUNT(*)::int as cnt
         FROM payments
         WHERE status::text = 'COMPLETED' AND "paymentDate" >= $1 AND "paymentDate" < $2`,
        thisMonthStart, thisMonthEnd
      ).catch(() => [{ total: 0, cnt: 0 }]),
      // Payments awaiting verification
      db.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int as c FROM payments WHERE "verificationStatus"::text = 'PENDING' AND status::text IN ('PENDING','AWAITING_VERIFICATION')`
      ).catch(() => [{ c: 0 }]),
      // Leases expiring within 30 days
      db.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int as c FROM lease_agreements WHERE status::text = 'ACTIVE' AND "endDate" >= $1 AND "endDate" <= $2`,
        now, thirtyDaysFromNow
      ).catch(() => [{ c: 0 }]),
      // This month's bills total expected vs collected
      db.$queryRawUnsafe<any[]>(
        `SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status::text = 'PAID')::int as paid,
          COALESCE(SUM(CASE WHEN status::text = 'PAID' THEN "totalAmount" ELSE 0 END), 0) as collected,
          COALESCE(SUM("totalAmount"), 0) as expected
         FROM monthly_bills
         WHERE month >= $1 AND month < $2`,
        thisMonthStart, thisMonthEnd
      ).catch(() => [{ total: 0, paid: 0, collected: 0, expected: 0 }]),
    ])

    const totalProperties = propsRes[0]?.c ?? 0
    const totalUnits = unitsRes[0]?.c ?? 0
    const totalTenants = tenantsRes[0]?.c ?? 0
    const occupiedUnits = occupiedRes[0]?.c ?? 0
    const vacantUnits = vacantRes[0]?.c ?? 0
    const reservedUnits = reservedRes[0]?.c ?? 0
    const openMaintenance = maintRes[0]?.c ?? 0
    const overdueCount = overdueRes[0]?.c ?? 0
    const pendingBillsCount = pendingBillsRes[0]?.c ?? 0
    const thisMonthRevenue = Number(revenueRes[0]?.total ?? 0)
    const paymentsCount = revenueRes[0]?.cnt ?? 0
    const pendingPayments = pendingPaymentsRes[0]?.c ?? 0
    const expiringLeases = expiringleasesRes[0]?.c ?? 0
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

    const billsThisMonth = thisMonthBillsRes[0] ?? { total: 0, paid: 0, collected: 0, expected: 0 }
    const collectionRate = Number(billsThisMonth.total) > 0
      ? Math.round((Number(billsThisMonth.paid) / Number(billsThisMonth.total)) * 100)
      : 0

    // Monthly revenue for last 6 months (use paymentDate)
    const revenueData: { month: string; revenue: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = d
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const [rev, exp] = await Promise.all([
        db.$queryRawUnsafe<any[]>(
          `SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status::text = 'COMPLETED' AND "paymentDate" >= $1 AND "paymentDate" < $2`,
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

    // Recent activity from activity_logs (last 8)
    const recentActivity = await db.$queryRawUnsafe<any[]>(`
      SELECT al.id, al.action, al."entityType", al."entityId", al.details, al."createdAt",
        u."firstName", u."lastName", u.email, u.role::text as role
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al."userId"
      ORDER BY al."createdAt" DESC
      LIMIT 8
    `).catch(() => [])

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
      vacantUnits,
      reservedUnits,
      openMaintenance,
      overdueCount,
      pendingBillsCount,
      thisMonthRevenue,
      paymentsCount,
      pendingPayments,
      expiringLeases,
      collectionRate,
      billsThisMonth: {
        total: Number(billsThisMonth.total),
        paid: Number(billsThisMonth.paid),
        collected: Number(billsThisMonth.collected),
        expected: Number(billsThisMonth.expected),
      },
      totalRevenue: thisMonthRevenue,
      revenueData,
      recentActivity: recentActivity.map(r => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        details: r.details,
        createdAt: r.createdAt,
        user: r.firstName
          ? { name: `${r.firstName} ${r.lastName}`.trim(), email: r.email, role: r.role }
          : null,
      })),
    })

  } catch (error: any) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats", details: error.message }, { status: 500 })
  }
}
