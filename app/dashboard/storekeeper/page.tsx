import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Package, AlertTriangle, ShoppingCart, TrendingUp, ArrowDown, ArrowUp, Plus } from "lucide-react"

const fmt = (n: number) => `KSh ${Math.round(n || 0).toLocaleString()}`

export default async function StorekeeperDashboardPage() {
  await requireRole(["ADMIN", "MANAGER", "STOREKEEPER"])

  try {
    const [
      totalItems, lowStockItems, pendingOrders, approvedOrders,
      recentMovements, inventoryValue, topItems,
    ] = await Promise.all([
      prisma.inventory_items.count({ where: { deletedAt: null } }),
      prisma.$queryRaw<{ id: string; name: string; quantity: number; minimumQuantity: number; unit: string }[]>`
        SELECT id, name, quantity, "minimumQuantity", "unitOfMeasure" as unit
        FROM inventory_items
        WHERE "deletedAt" IS NULL AND quantity <= "minimumQuantity"
        ORDER BY quantity ASC
        LIMIT 10
      `.catch(() => [] as any[]),
      prisma.purchase_orders.count({ where: { status: 'PENDING' } }).catch(() => 0),
      prisma.purchase_orders.count({ where: { status: 'APPROVED' } }).catch(() => 0),
      prisma.inventory_movements.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { inventory_items: { select: { name: true, unitOfMeasure: true } } },
      }).catch(() => []),
      prisma.inventory_items.aggregate({ where: { deletedAt: null }, _sum: { quantity: true } }),
      prisma.inventory_items.findMany({ where: { deletedAt: null }, orderBy: { quantity: 'desc' }, take: 5, select: { name: true, quantity: true, unitOfMeasure: true, minimumQuantity: true } }).catch(() => []),
    ])

    return (
      <div className="space-y-6 text-white">
        <div>
          <h2 className="text-2xl font-bold">Storekeeper Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">Inventory and supply management</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Items", value: totalItems, sub: `${Number(inventoryValue._sum.quantity ?? 0).toLocaleString()} total units`, icon: Package, color: "purple" },
            { label: "Low Stock", value: (lowStockItems as any[]).length, sub: "at or below minimum", icon: AlertTriangle, color: (lowStockItems as any[]).length > 0 ? "red" : "green" },
            { label: "Pending Orders", value: pendingOrders, sub: "awaiting approval", icon: ShoppingCart, color: pendingOrders > 0 ? "amber" : "green" },
            { label: "Approved Orders", value: approvedOrders, sub: "ready to receive", icon: TrendingUp, color: approvedOrders > 0 ? "blue" : "green" },
          ].map(({ label, value, sub, icon: Icon, color }) => {
            const colors: Record<string, string> = { purple: "border-purple-500/20 from-purple-500/10", green: "border-green-500/20 from-green-500/10", amber: "border-amber-500/20 from-amber-500/10", red: "border-red-500/20 from-red-500/10", blue: "border-blue-500/20 from-blue-500/10" }
            return (
              <div key={label} className={`bg-gradient-to-br ${colors[color] ?? colors.purple} to-transparent border rounded-xl p-5`}>
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

        {/* Low stock alert */}
        {(lowStockItems as any[]).length > 0 && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className="text-red-400" />
              <h3 className="text-red-300 font-semibold text-sm">{(lowStockItems as any[]).length} Items Need Restocking</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {(lowStockItems as any[]).map((item: any) => (
                <span key={item.id} className="text-xs bg-red-900/30 border border-red-500/20 rounded-lg px-3 py-1 text-red-200">
                  {item.name} — {item.quantity}/{item.minimumQuantity} {item.unit}
                </span>
              ))}
            </div>
            <Link href="/dashboard/purchase-orders/new" className="inline-flex items-center gap-1 mt-3 text-xs text-red-300 underline hover:text-red-200">
              <Plus size={12} /> Create purchase order
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent movements */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Recent Movements</h3>
              <Link href="/dashboard/inventory" className="text-xs text-purple-400 hover:text-purple-300">View inventory →</Link>
            </div>
            {(recentMovements as any[]).length === 0 ? (
              <p className="px-5 py-8 text-gray-500 text-sm text-center">No recent movements</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {(recentMovements as any[]).map((m: any) => (
                  <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${m.type === 'IN' ? 'bg-green-900/40' : 'bg-red-900/40'}`}>
                        {m.type === 'IN' ? <ArrowDown size={12} className="text-green-400" /> : <ArrowUp size={12} className="text-red-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{m.inventory_items?.name}</p>
                        <p className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-medium flex-shrink-0 ${m.type === 'IN' ? 'text-green-400' : 'text-red-400'}`}>
                      {m.type === 'IN' ? '+' : '-'}{m.quantity} {m.inventory_items?.unitOfMeasure}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top items */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h3 className="font-semibold text-sm">Stock Overview</h3>
            </div>
            {(topItems as any[]).length === 0 ? (
              <p className="px-5 py-8 text-gray-500 text-sm text-center">No inventory items</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {(topItems as any[]).map((item: any) => {
                  const pct = item.minimumQuantity > 0 ? Math.min(100, Math.round((item.quantity / (item.minimumQuantity * 3)) * 100)) : 100
                  const barColor = item.quantity <= item.minimumQuantity ? 'bg-red-500' : item.quantity <= item.minimumQuantity * 2 ? 'bg-amber-500' : 'bg-green-500'
                  return (
                    <div key={item.name} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white">{item.name}</span>
                        <span className="text-xs text-gray-400">{item.quantity} {item.unitOfMeasure}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "View Inventory", href: "/dashboard/inventory", icon: Package },
            { label: "Purchase Orders", href: "/dashboard/purchase-orders", icon: ShoppingCart },
            { label: "New PO", href: "/dashboard/purchase-orders/new", icon: Plus },
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
    console.error('[STOREKEEPER] dashboard error:', e?.message)
    throw e
  }
}
