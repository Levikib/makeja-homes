import { requireRole } from "@/lib/auth-helpers"
import { headers } from "next/headers"
import { PrismaClient } from "@prisma/client"
import Link from "next/link"
import { Building2, Home, Wrench, Users, CheckCircle, Clock, AlertTriangle } from "lucide-react"

function buildPrisma() {
  const base = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '').replace(/[?&]schema=[^&]*/g, '')
  function getSchema(host: string) {
    const p = host.split('.'); if (p.length >= 4) { const s = p[0].toLowerCase(); if (!['www','app','api'].includes(s) && /^[a-z0-9-]+$/.test(s)) return `tenant_${s}` } return 'public'
  }
  const h = headers(); const host = h.get('x-forwarded-host') || h.get('host') || ''
  const schema = getSchema(host); const sep = base.includes('?') ? '&' : '?'
  return new PrismaClient({ datasources: { db: { url: `${base}${sep}schema=${schema}` } } })
}

export default async function CaretakerDashboardPage() {
  await requireRole(["ADMIN", "MANAGER", "CARETAKER"])
  const prisma = buildPrisma()

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalProperties, totalUnits, occupiedUnits, vacantUnits,
      pendingMaintenance, inProgressMaintenance, urgentMaintenance,
      completedToday, recentRequests,
    ] = await Promise.all([
      prisma.properties.count({ where: { deletedAt: null } }),
      prisma.units.count({ where: { deletedAt: null } }),
      prisma.units.count({ where: { status: 'OCCUPIED', deletedAt: null } }),
      prisma.units.count({ where: { status: 'VACANT', deletedAt: null } }),
      prisma.maintenance_requests.count({ where: { status: 'PENDING' } }),
      prisma.maintenance_requests.count({ where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } }),
      prisma.maintenance_requests.count({ where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] }, priority: 'URGENT' } }),
      prisma.maintenance_requests.count({ where: { status: 'COMPLETED', completedAt: { gte: today } } }),
      prisma.maintenance_requests.findMany({
        where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        take: 8,
        include: { units: { include: { properties: { select: { name: true } } } } },
      }).catch(() => []),
    ])

    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

    const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    const priorityColor: Record<string, string> = {
      URGENT: 'bg-red-900/40 text-red-300 border-red-500/30',
      HIGH: 'bg-orange-900/40 text-orange-300 border-orange-500/30',
      MEDIUM: 'bg-amber-900/40 text-amber-300 border-amber-500/30',
      LOW: 'bg-gray-800 text-gray-400 border-gray-700',
    }
    const statusColor: Record<string, string> = {
      PENDING: 'text-gray-400',
      ASSIGNED: 'text-blue-400',
      IN_PROGRESS: 'text-amber-400',
    }

    return (
      <div className="space-y-6 text-white">
        <div>
          <h2 className="text-2xl font-bold">Caretaker Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">Property oversight and maintenance</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Properties", value: totalProperties, sub: `${totalUnits} units`, icon: Building2, color: "purple" },
            { label: "Occupancy", value: `${occupancyRate}%`, sub: `${vacantUnits} vacant`, icon: Home, color: occupancyRate >= 90 ? "green" : "amber" },
            { label: "Open Requests", value: pendingMaintenance + inProgressMaintenance, sub: `${inProgressMaintenance} in progress`, icon: Wrench, color: urgentMaintenance > 0 ? "red" : "amber" },
            { label: "Completed Today", value: completedToday, sub: "maintenance done", icon: CheckCircle, color: "green" },
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

        {/* Urgent alert */}
        {urgentMaintenance > 0 && (
          <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{urgentMaintenance} urgent maintenance request{urgentMaintenance > 1 ? 's' : ''} require immediate attention.</p>
            <Link href="/dashboard/maintenance" className="ml-auto text-red-300 text-xs underline whitespace-nowrap">View →</Link>
          </div>
        )}

        {/* Maintenance queue */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Active Maintenance Queue</h3>
            <Link href="/dashboard/maintenance" className="text-xs text-purple-400 hover:text-purple-300">View all →</Link>
          </div>
          {(recentRequests as any[]).length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">All clear — no open maintenance requests</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {(recentRequests as any[]).map((m: any) => (
                <Link key={m.id} href={`/dashboard/maintenance/${m.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-800/40 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate font-medium">{m.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.units?.properties?.name} · Unit {m.units?.unitNumber}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{m.category} · {new Date(m.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor[m.priority] ?? priorityColor.LOW}`}>{m.priority}</span>
                    <span className={`text-xs ${statusColor[m.status] ?? 'text-gray-400'}`}>{m.status.replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "New Request", href: "/dashboard/maintenance/new", icon: Wrench },
            { label: "All Properties", href: "/dashboard/admin/properties", icon: Building2 },
            { label: "All Units", href: "/dashboard/units", icon: Home },
          ].map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} className="flex flex-col items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition text-center">
              <Icon size={20} className="text-purple-400" />
              <span className="text-xs text-gray-300">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    )
  } finally {
    await prisma.$disconnect()
  }
}
