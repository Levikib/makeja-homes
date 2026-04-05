import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Wrench, Clock, CheckCircle, AlertTriangle, Plus } from "lucide-react"

const priorityColor: Record<string, string> = { URGENT: 'bg-red-900/40 text-red-300 border-red-500/30', HIGH: 'bg-orange-900/40 text-orange-300 border-orange-500/30', MEDIUM: 'bg-amber-900/40 text-amber-300 border-amber-500/30', LOW: 'bg-gray-800 text-gray-400 border-gray-700' }
const statusColor: Record<string, string> = { PENDING: 'text-gray-400', ASSIGNED: 'text-blue-400', IN_PROGRESS: 'text-amber-400', COMPLETED: 'text-green-400' }

export default async function TechnicalDashboardPage() {
  await requireRole(["ADMIN", "MANAGER", "TECHNICAL"])
  try {
    const today = new Date(); today.setHours(0,0,0,0)
    const [pendingCount, inProgressCount, urgentCount, completedToday, completedThisWeek, openRequests] = await Promise.all([
      prisma.maintenance_requests.count({ where: { status: 'PENDING' } }),
      prisma.maintenance_requests.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.maintenance_requests.count({ where: { status: { in: ['PENDING','ASSIGNED','IN_PROGRESS'] }, priority: 'URGENT' } }),
      prisma.maintenance_requests.count({ where: { status: 'COMPLETED', completedAt: { gte: today } } }),
      prisma.maintenance_requests.count({ where: { status: 'COMPLETED', completedAt: { gte: new Date(today.getTime() - 6*24*60*60*1000) } } }),
      prisma.maintenance_requests.findMany({ where: { status: { in: ['PENDING','ASSIGNED','IN_PROGRESS'] } }, orderBy: [{ priority: 'asc' },{ createdAt: 'asc' }], take: 10, include: { units: { include: { properties: { select: { name: true } } } } } }).catch(() => []),
    ])
    return (
      <div className="space-y-6 text-white">
        <div><h2 className="text-2xl font-bold">Technical Dashboard</h2><p className="text-gray-400 text-sm mt-1">Maintenance and work order management</p></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Pending", value: pendingCount, sub: "awaiting assignment", icon: Clock, color: "amber" },
            { label: "In Progress", value: inProgressCount, sub: "active work orders", icon: Wrench, color: "blue" },
            { label: "Urgent", value: urgentCount, sub: "immediate attention", icon: AlertTriangle, color: urgentCount > 0 ? "red" : "green" },
            { label: "Completed Today", value: completedToday, sub: `${completedThisWeek} this week`, icon: CheckCircle, color: "green" },
          ].map(({ label, value, sub, icon: Icon, color }) => {
            const colors: Record<string,string> = { amber: "border-amber-500/20 from-amber-500/10", blue: "border-blue-500/20 from-blue-500/10", red: "border-red-500/20 from-red-500/10", green: "border-green-500/20 from-green-500/10" }
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
        {urgentCount > 0 && (
          <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{urgentCount} URGENT request{urgentCount > 1 ? 's' : ''} require immediate attention.</p>
            <Link href="/dashboard/maintenance" className="ml-auto text-red-300 text-xs underline whitespace-nowrap">Open queue</Link>
          </div>
        )}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Open Work Orders</h3>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/maintenance/new" className="flex items-center gap-1 text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition"><Plus size={12} /> New</Link>
              <Link href="/dashboard/maintenance" className="text-xs text-purple-400 hover:text-purple-300">View all</Link>
            </div>
          </div>
          {(openRequests as any[]).length === 0 ? (
            <div className="px-5 py-10 text-center"><CheckCircle size={32} className="text-green-500 mx-auto mb-2" /><p className="text-gray-400 text-sm">All clear — no open work orders</p></div>
          ) : (
            <div className="divide-y divide-gray-800">
              {(openRequests as any[]).map((m: any) => (
                <Link key={m.id} href={`/dashboard/maintenance/${m.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-800/40 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate font-medium">{m.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.units?.properties?.name} · Unit {m.units?.unitNumber}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor[m.priority] ?? priorityColor.LOW}`}>{m.priority}</span>
                    <span className={`text-xs ${statusColor[m.status] ?? 'text-gray-400'}`}>{m.status.replace('_',' ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[{ label: "All Maintenance", href: "/dashboard/maintenance", icon: Wrench },{ label: "New Request", href: "/dashboard/maintenance/new", icon: Plus }].map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} className="flex flex-col items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition text-center">
              <Icon size={20} className="text-purple-400" />
              <span className="text-xs text-gray-300">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    )
  } catch (e: any) {
    console.error('[TECHNICAL] dashboard error:', e?.message)
    throw e
  }
}
