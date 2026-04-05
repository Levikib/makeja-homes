import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Building2, Users, DollarSign, FileText, Wrench, AlertTriangle, TrendingUp, Clock } from "lucide-react"

const fmt = (n: number) => `KSh ${Math.round(n || 0).toLocaleString()}`

export default async function ManagerDashboardPage() {
  await requireRole(["ADMIN", "MANAGER"])

  try {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const [
      totalProperties, totalUnits, occupiedUnits,
      activeLeases, expiringLeases, pendingApplications,
      openMaintenance, urgentMaintenance,
      monthPayments, overdueCount,
      recentPayments, recentMaintenance,
    ] = await Promise.all([
      prisma.properties.count({ where: { deletedAt: null } }),
      prisma.units.count({ where: { deletedAt: null } }),
      prisma.units.count({ where: { status: 'OCCUPIED', deletedAt: null } }),
      prisma.lease_agreements.count({ where: { status: 'ACTIVE' } }),
      prisma.lease_agreements.count({ where: { status: 'ACTIVE', endDate: { gte: now, lte: thirtyDays } } }),
      prisma.lease_agreements.count({ where: { status: 'PENDING' } }).catch(() => 0),
      prisma.maintenance_requests.count({ where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } } }),
      prisma.maintenance_requests.count({ where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] }, priority: { in: ['URGENT', 'HIGH'] } } }),
      prisma.payments.aggregate({ where: { status: 'COMPLETED', verificationStatus: 'APPROVED', paymentDate: { gte: thisMonthStart } }, _sum: { amount: true }, _count: true }),
      prisma.monthly_bills.count({ where: { status: 'OVERDUE' } }),
      prisma.payments.findMany({ where: { status: 'COMPLETED' }, orderBy: { paymentDate: 'desc' }, take: 5, include: { lease_agreements: { include: { tenants: { include: { users: { select: { firstName: true, lastName: true } } } }, units: { include: { properties: { select: { name: true } } } } } } } }).catch(() => []),
      prisma.maintenance_requests.findMany({ where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } }, orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }], take: 5, include: { units: { include: { properties: { select: { name: true } } } } } }).catch(() => []),
    ])

    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
    const collectionRate = activeLeases > 0 ? Math.round((monthPayments._count / activeLeases) * 100) : 0

    return (
      <div className="space-y-6 text-white">
        <div>
          <h2 className="text-2xl font-bold">Manager Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">Property and tenant management overview</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Properties", value: totalProperties, sub: `${totalUnits} total units`, icon: Building2, color: "purple" },
            { label: "Occupancy", value: `${occupancyRate}%`, sub: `${occupiedUnits}/${totalUnits} occupied`, icon: Users, color: occupancyRate >= 90 ? "green" : occupancyRate >= 75 ? "amber" : "red" },
            { label: "This Month", value: fmt(Number(monthPayments._sum.amount ?? 0)), sub: `${monthPayments._count} payments`, icon: DollarSign, color: "green" },
            { label: "Open Maintenance", value: openMaintenance, sub: `${urgentMaintenance} urgent/high`, icon: Wrench, color: urgentMaintenance > 0 ? "red" : "amber" },
          ].map(({ label, value, sub, icon: Icon, color }) => {
            const colors: Record<string, string> = { purple: "border-purple-500/20 from-purple-500/10", green: "border-green-500/20 from-green-500/10", amber: "border-amber-500/20 from-amber-500/10", red: "border-red-500/20 from-red-500/10" }
            return (
              <div key={label} className={`bg-gradient-to-br ${colors[color]} to-transparent border rounded-xl p-5`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-xs uppercase tracking-wide">{label}</p>
                  <Icon size={16} className="text-gray-500" />
                </div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-gray-400 text-xs mt-1">{sub}</p>
              </div>
            )
          })}
        </div>

        {/* Alert row */}
        {(overdueCount > 0 || expiringLeases > 0 || pendingApplications > 0) && (
          <div className="flex flex-wrap gap-3">
            {overdueCount > 0 && (
              <Link href="/dashboard/admin/payments" className="flex items-center gap-2 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-2 text-sm text-red-300 hover:bg-red-900/30 transition">
                <AlertTriangle size={14} /> {overdueCount} overdue bill{overdueCount > 1 ? 's' : ''}
              </Link>
            )}
            {expiringLeases > 0 && (
              <Link href="/dashboard/manager/leases" className="flex items-center gap-2 bg-amber-900/20 border border-amber-500/30 rounded-xl px-4 py-2 text-sm text-amber-300 hover:bg-amber-900/30 transition">
                <Clock size={14} /> {expiringLeases} lease{expiringLeases > 1 ? 's' : ''} expiring soon
              </Link>
            )}
            {pendingApplications > 0 && (
              <Link href="/dashboard/manager/leases" className="flex items-center gap-2 bg-blue-900/20 border border-blue-500/30 rounded-xl px-4 py-2 text-sm text-blue-300 hover:bg-blue-900/30 transition">
                <FileText size={14} /> {pendingApplications} pending application{pendingApplications > 1 ? 's' : ''}
              </Link>
            )}
          </div>
        )}

        {/* Two-column: recent payments + open maintenance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Payments */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Recent Payments</h3>
              <Link href="/dashboard/admin/payments" className="text-xs text-purple-400 hover:text-purple-300">View all →</Link>
            </div>
            {(recentPayments as any[]).length === 0 ? (
              <p className="px-5 py-8 text-gray-500 text-sm text-center">No payments yet this month</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {(recentPayments as any[]).map((p: any) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">{p.lease_agreements?.tenants?.users?.firstName} {p.lease_agreements?.tenants?.users?.lastName}</p>
                      <p className="text-xs text-gray-500">{p.lease_agreements?.units?.properties?.name} · {p.lease_agreements?.units?.unitNumber}</p>
                    </div>
                    <span className="text-green-400 text-sm font-medium">{fmt(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open Maintenance */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Open Maintenance</h3>
              <Link href="/dashboard/maintenance" className="text-xs text-purple-400 hover:text-purple-300">View all →</Link>
            </div>
            {(recentMaintenance as any[]).length === 0 ? (
              <p className="px-5 py-8 text-gray-500 text-sm text-center">No open maintenance requests</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {(recentMaintenance as any[]).map((m: any) => (
                  <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{m.title}</p>
                      <p className="text-xs text-gray-500">{m.units?.properties?.name} · {m.units?.unitNumber}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${m.priority === 'URGENT' ? 'bg-red-900/40 text-red-300' : m.priority === 'HIGH' ? 'bg-orange-900/40 text-orange-300' : 'bg-gray-800 text-gray-400'}`}>
                      {m.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Add Tenant", href: "/dashboard/manager/tenants", icon: Users },
            { label: "New Lease", href: "/dashboard/manager/leases", icon: FileText },
            { label: "Record Payment", href: "/dashboard/admin/payments", icon: DollarSign },
            { label: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
          ].map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} className="flex flex-col items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition text-center">
              <Icon size={20} className="text-purple-400" />
              <span className="text-xs text-gray-300">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    )
  } catch (e: any) {
    console.error('[MANAGER] dashboard error:', e?.message)
    throw e
  }
}
