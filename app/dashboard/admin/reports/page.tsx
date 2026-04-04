"use client"

import { useState, useEffect, useCallback } from "react"
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import {
  TrendingUp, DollarSign, Building2, Users, FileText,
  AlertTriangle, Download, RefreshCw, Calendar, ChevronDown,
} from "lucide-react"

const fmt = (n: number) => `KSh ${Math.round(n || 0).toLocaleString()}`
const fmtDate = (d: any) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })

type OverviewData = {
  totalProperties: number
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  occupancyRate: number
  totalTenants: number
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  overdueCount: number
  pendingVerification: number
}

const COLORS = ["#a855f7", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "occupancy" | "arrears" | "expenses">("overview")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: activeTab, from: fromDate, to: toDate })
      const res = await fetch(`/api/admin/reports?${params}`)
      if (!res.ok) throw new Error("Failed to fetch report")
      setData(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, fromDate, toDate])

  useEffect(() => { fetchReport() }, [fetchReport])

  const exportCSV = async (action: string) => {
    try {
      const res = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, from: fromDate, to: toDate }),
      })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${action.replace("export-", "")}-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    }
  }

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "payments", label: "Payments" },
    { key: "occupancy", label: "Occupancy" },
    { key: "arrears", label: "Arrears" },
    { key: "expenses", label: "Expenses" },
  ]

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Financial and operational insights</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date" value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg"
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="date" value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg"
          />
          <button
            onClick={fetchReport}
            className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-max px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && data && activeTab === "overview" && <OverviewTab data={data} />}
      {!loading && data && activeTab === "payments" && (
        <PaymentsTab data={data} onExport={() => exportCSV("export-payments-csv")} />
      )}
      {!loading && data && activeTab === "occupancy" && <OccupancyTab data={data} />}
      {!loading && data && activeTab === "arrears" && (
        <ArrearsTab data={data} onExport={() => exportCSV("export-arrears-csv")} />
      )}
      {!loading && data && activeTab === "expenses" && <ExpensesTab data={data} />}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color = "purple", sub }: {
  label: string; value: string; icon: any; color?: string; sub?: string
}) {
  const colorMap: Record<string, string> = {
    purple: "from-purple-500/20 to-purple-900/10 border-purple-500/20",
    green: "from-green-500/20 to-green-900/10 border-green-500/20",
    blue: "from-blue-500/20 to-blue-900/10 border-blue-500/20",
    red: "from-red-500/20 to-red-900/10 border-red-500/20",
    amber: "from-amber-500/20 to-amber-900/10 border-amber-500/20",
    pink: "from-pink-500/20 to-pink-900/10 border-pink-500/20",
  }
  const iconColor: Record<string, string> = {
    purple: "text-purple-400", green: "text-green-400", blue: "text-blue-400",
    red: "text-red-400", amber: "text-amber-400", pink: "text-pink-400",
  }
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
        </div>
        <Icon size={20} className={iconColor[color]} />
      </div>
    </div>
  )
}

function OverviewTab({ data }: { data: any }) {
  const o: OverviewData = data.overview
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={fmt(o.totalRevenue)} icon={DollarSign} color="purple" />
        <StatCard label="Total Expenses" value={fmt(o.totalExpenses)} icon={TrendingUp} color="red" />
        <StatCard label="Net Income" value={fmt(o.netIncome)} icon={TrendingUp} color={o.netIncome >= 0 ? "green" : "red"} />
        <StatCard label="Occupancy Rate" value={`${o.occupancyRate}%`} icon={Building2} color="blue" sub={`${o.occupiedUnits}/${o.totalUnits} units`} />
        <StatCard label="Properties" value={String(o.totalProperties)} icon={Building2} color="blue" />
        <StatCard label="Tenants" value={String(o.totalTenants)} icon={Users} color="pink" />
        <StatCard label="Overdue Bills" value={String(o.overdueCount)} icon={AlertTriangle} color="amber" />
        <StatCard label="Pending Verification" value={String(o.pendingVerification)} icon={FileText} color="amber" />
      </div>

      {data.monthlyRevenue?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4">Revenue — Last 6 Months</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.monthlyRevenue}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(v: any) => [fmt(v), "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#a855f7" fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function PaymentsTab({ data, onExport }: { data: any; onExport: () => void }) {
  const s = data.summary
  const byMethod = Object.entries(s.byMethod ?? {}).map(([k, v]) => ({ name: k.replace(/_/g, " "), value: v as number }))
  const byType = Object.entries(s.byType ?? {}).map(([k, v]) => ({ name: k, value: v as number }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-3 gap-4 flex-1">
          <StatCard label="Total Collected" value={fmt(s.total)} icon={DollarSign} color="green" />
          <StatCard label="Transactions" value={String(s.count)} icon={FileText} color="blue" />
          <StatCard label="Avg per Payment" value={fmt(s.count > 0 ? s.total / s.count : 0)} icon={TrendingUp} color="purple" />
        </div>
        <button
          onClick={onExport}
          className="ml-4 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors border border-gray-700"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {byMethod.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4 text-gray-300">By Payment Method</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(props: any) => `${props.name ?? ""} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`}>
                  {byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {byType.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4 text-gray-300">By Payment Type</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} />
                <Bar dataKey="value" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Tenant</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Property / Unit</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Type</th>
              <th className="text-right px-4 py-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(data.payments ?? []).slice(0, 50).map((p: any) => (
              <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 text-gray-300">{fmtDate(p.paymentDate)}</td>
                <td className="px-4 py-3 text-white">{p.tenant}</td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{p.property} / {p.unit}</td>
                <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{p.paymentType}</td>
                <td className="px-4 py-3 text-green-400 text-right font-medium">{fmt(p.amount)}</td>
              </tr>
            ))}
            {(data.payments ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No payments in this period</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OccupancyTab({ data }: { data: any }) {
  const properties: any[] = data.properties ?? []
  const totalUnits = properties.reduce((s: number, p: any) => s + p.totalUnits, 0)
  const totalOccupied = properties.reduce((s: number, p: any) => s + p.occupied, 0)
  const overallRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Overall Occupancy" value={`${overallRate}%`} icon={TrendingUp} color="purple" />
        <StatCard label="Occupied Units" value={String(totalOccupied)} icon={Building2} color="green" />
        <StatCard label="Vacant Units" value={String(totalUnits - totalOccupied)} icon={Building2} color="red" />
      </div>

      {properties.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 text-gray-300">Occupancy by Property</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={properties.map((p: any) => ({ name: p.name, occupied: p.occupied, vacant: p.vacant }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="occupied" fill="#10b981" radius={[4, 4, 0, 0]} name="Occupied" />
              <Bar dataKey="vacant" fill="#ef4444" radius={[4, 4, 0, 0]} name="Vacant" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Property</th>
              <th className="text-right px-4 py-3">Total</th>
              <th className="text-right px-4 py-3">Occupied</th>
              <th className="text-right px-4 py-3">Vacant</th>
              <th className="text-right px-4 py-3">Rate</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">Actual Revenue</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p: any) => (
              <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 text-white">{p.name} <span className="text-gray-500 text-xs">— {p.city}</span></td>
                <td className="px-4 py-3 text-right text-gray-300">{p.totalUnits}</td>
                <td className="px-4 py-3 text-right text-green-400">{p.occupied}</td>
                <td className="px-4 py-3 text-right text-red-400">{p.vacant}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-medium ${p.occupancyRate >= 80 ? "text-green-400" : p.occupancyRate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                    {p.occupancyRate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-300 hidden md:table-cell">{fmt(p.actualRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ArrearsTab({ data, onExport }: { data: any; onExport: () => void }) {
  const s = data.summary
  const arrears: any[] = data.arrears ?? []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-2 gap-4 flex-1">
          <StatCard label="Total Arrears" value={fmt(s.totalArrears)} icon={AlertTriangle} color="red" />
          <StatCard label="Overdue Bills" value={String(s.count)} icon={FileText} color="amber" />
        </div>
        <button
          onClick={onExport}
          className="ml-4 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors border border-gray-700"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Tenant</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Property / Unit</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Month</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-right px-4 py-3">Days Overdue</th>
            </tr>
          </thead>
          <tbody>
            {arrears.map((a: any) => (
              <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <p className="text-white">{a.tenant}</p>
                  <p className="text-gray-400 text-xs">{a.phone}</p>
                </td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{a.property} / {a.unit}</td>
                <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                  {new Date(a.month).toLocaleString("en-KE", { month: "long", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-right text-red-400 font-medium">{fmt(a.totalAmount)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-medium text-xs px-2 py-1 rounded-full ${a.daysOverdue > 30 ? "bg-red-900/40 text-red-300" : "bg-amber-900/40 text-amber-300"}`}>
                    {a.daysOverdue}d
                  </span>
                </td>
              </tr>
            ))}
            {arrears.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No overdue bills</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ExpensesTab({ data }: { data: any }) {
  const s = data.summary
  const expenses: any[] = data.expenses ?? []
  const byCategory = Object.entries(s.byCategory ?? {}).map(([k, v]) => ({ name: k, value: v as number }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Expenses" value={fmt(s.total)} icon={DollarSign} color="red" />
        <StatCard label="Transactions" value={String(s.count)} icon={FileText} color="blue" />
      </div>

      {byCategory.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 text-gray-300">By Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} />
              <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Description</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Property</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Date</th>
              <th className="text-right px-4 py-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.slice(0, 50).map((e: any) => (
              <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 text-white">{e.description}</td>
                <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{e.category ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{e.property}</td>
                <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{fmtDate(e.date)}</td>
                <td className="px-4 py-3 text-right text-red-400 font-medium">{fmt(e.amount)}</td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No expenses in this period</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
