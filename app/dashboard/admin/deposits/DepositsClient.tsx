"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import Link from "next/link"
import {
  Shield, Search, X, ChevronDown, ArrowDownToLine, Mail, Phone,
  MapPin, Calendar, AlertTriangle, CheckCircle, Clock, TrendingDown,
  Wrench, FileText, Activity, DollarSign, Home
} from "lucide-react"

// ---- Types ----------------------------------------------------------------

interface Deposit {
  id: string
  tenantId: string
  tenantName: string
  email: string
  phone: string | null
  unitNumber: string
  propertyName: string
  propertyId: string
  amount: number
  status: string
  paidDate: string | null
  refundDate: string | null
  refundAmount: number | null
  deductionsTotal: number
  refundMethod: string | null
  leaseStart: string | null
  leaseEnd: string | null
  daysUntilExpiry: number | null
  hasAssessment: boolean
  assessmentTotal: number
  hasVacateNotice: boolean
  vacateDate: string | null
}

interface Stats {
  totalHeld: number
  heldCount: number
  totalRefunded: number
  refundedCount: number
  totalDeductions: number
  pendingRefunds: number
  averageDeposit: number
  collectionRate: number
  pendingCount: number
}

// ---- Helpers ---------------------------------------------------------------

const fmt = (n: number) =>
  `KSh ${Math.round(n || 0).toLocaleString()}`

function getStatusLabel(deposit: Deposit): string {
  if (deposit.status === "REFUNDED") return "REFUNDED"
  if (deposit.status === "PENDING") return "PENDING"
  if (deposit.daysUntilExpiry != null && deposit.daysUntilExpiry < 0) return "OVERDUE"
  return "HELD"
}

const STATUS_STYLES: Record<string, string> = {
  HELD: "bg-purple-500/15 text-purple-300 border border-purple-500/30",
  PENDING: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  REFUNDED: "bg-green-500/15 text-green-300 border border-green-500/30",
  OVERDUE: "bg-red-500/15 text-red-300 border border-red-500/30",
}

function avatarGradient(name: string): string {
  const gradients = [
    "from-purple-500 to-pink-500",
    "from-blue-500 to-cyan-500",
    "from-orange-500 to-amber-500",
    "from-green-500 to-emerald-500",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-violet-500",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return gradients[Math.abs(hash) % gradients.length]
}

function initials(name: string): string {
  const parts = name.trim().split(" ")
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")
}

// ---- Lifecycle dots --------------------------------------------------------

function LifecycleDots({ deposit }: { deposit: Deposit }) {
  const statusLabel = getStatusLabel(deposit)
  const stages = [
    { key: "leased", label: "Active", done: true },
    { key: "paid", label: "Paid", done: !!deposit.paidDate || statusLabel !== "PENDING" },
    { key: "assessed", label: "Assessed", done: deposit.hasAssessment },
    { key: "refunded", label: "Refunded", done: statusLabel === "REFUNDED" },
  ]
  return (
    <div className="flex items-center gap-0 mt-3">
      {stages.map((stage, i) => (
        <div key={stage.key} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-0.5">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                stage.done
                  ? "bg-purple-400 shadow-sm shadow-purple-400/50"
                  : "bg-gray-700 border border-gray-600"
              }`}
            />
            <span className={`text-[9px] font-medium whitespace-nowrap ${stage.done ? "text-purple-400" : "text-gray-600"}`}>
              {stage.label}
            </span>
          </div>
          {i < stages.length - 1 && (
            <div
              className={`h-px flex-1 mx-1 mb-3.5 ${
                stages[i + 1].done ? "bg-purple-500/50" : "bg-gray-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ---- Detail Panel ----------------------------------------------------------

function DetailPanel({ deposit, onClose }: { deposit: Deposit; onClose: () => void }) {
  const statusLabel = getStatusLabel(deposit)

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        onClick={onClose}
      />
      {/* panel */}
      <div className="relative w-full max-w-md h-full bg-gray-900 border-l border-gray-700 shadow-2xl pointer-events-auto overflow-y-auto flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 p-5 flex items-start justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarGradient(deposit.tenantName)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
              {initials(deposit.tenantName)}
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">{deposit.tenantName}</h2>
              <p className="text-gray-400 text-xs mt-0.5">Unit {deposit.unitNumber} · {deposit.propertyName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Contact */}
          <div className="bg-gray-800/60 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact Info</h3>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Mail size={13} className="text-gray-500 flex-shrink-0" />
              <span className="truncate">{deposit.email}</span>
            </div>
            {deposit.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Phone size={13} className="text-gray-500 flex-shrink-0" />
                <span>{deposit.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Home size={13} className="text-gray-500 flex-shrink-0" />
              <span>Unit {deposit.unitNumber}, {deposit.propertyName}</span>
            </div>
          </div>

          {/* Deposit summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Deposit Held</p>
              <p className="text-lg font-bold text-purple-300 font-mono">{fmt(deposit.amount)}</p>
            </div>
            <div className={`border rounded-xl p-3 text-center ${statusLabel === "REFUNDED" ? "bg-green-500/10 border-green-500/20" : "bg-gray-800/60 border-gray-700"}`}>
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[statusLabel] ?? STATUS_STYLES.HELD}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Timeline</h3>
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-700" />
              <div className="space-y-5">
                {deposit.leaseStart && (
                  <TimelineItem
                    icon={<Calendar size={12} />}
                    color="blue"
                    title="Lease Started"
                    date={deposit.leaseStart}
                    done
                  />
                )}
                <TimelineItem
                  icon={<Shield size={12} />}
                  color="purple"
                  title="Deposit Paid"
                  subtitle={fmt(deposit.amount)}
                  date={deposit.paidDate}
                  done={!!deposit.paidDate || statusLabel !== "PENDING"}
                />
                {deposit.leaseEnd && (
                  <TimelineItem
                    icon={<Calendar size={12} />}
                    color={statusLabel === "OVERDUE" || statusLabel === "REFUNDED" ? "red" : "gray"}
                    title="Lease Ended"
                    date={deposit.leaseEnd}
                    done={deposit.daysUntilExpiry != null && deposit.daysUntilExpiry <= 0}
                  />
                )}
                {deposit.hasAssessment && (
                  <TimelineItem
                    icon={<Wrench size={12} />}
                    color="amber"
                    title="Damage Assessed"
                    subtitle={`${fmt(deposit.assessmentTotal)} deducted`}
                    done
                  />
                )}
                {statusLabel === "REFUNDED" ? (
                  <TimelineItem
                    icon={<CheckCircle size={12} />}
                    color="green"
                    title="Refund Processed"
                    subtitle={`${fmt(deposit.refundAmount ?? 0)} via ${deposit.refundMethod ?? "N/A"}`}
                    date={deposit.refundDate}
                    done
                  />
                ) : (
                  <TimelineItem
                    icon={<Clock size={12} />}
                    color="gray"
                    title="Refund Pending"
                    done={false}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Refund summary if refunded */}
          {statusLabel === "REFUNDED" && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={15} className="text-green-400" />
                <h3 className="text-sm font-semibold text-green-300">Refund Complete</h3>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Deposit held</span><span className="font-mono">{fmt(deposit.amount)}</span></div>
                {deposit.deductionsTotal > 0 && (
                  <div className="flex justify-between"><span className="text-gray-400">Deductions</span><span className="text-red-400 font-mono">- {fmt(deposit.deductionsTotal)}</span></div>
                )}
                <div className="flex justify-between font-bold border-t border-gray-700 pt-2">
                  <span>Refunded</span>
                  <span className="text-green-400 font-mono">{fmt(deposit.refundAmount ?? 0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {statusLabel !== "REFUNDED" && (
          <div className="sticky bottom-0 bg-gray-900/95 border-t border-gray-800 p-4 flex gap-3">
            <Link
              href={`/dashboard/admin/deposit-refund?tenantId=${deposit.tenantId}`}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl py-2.5 text-sm font-medium transition-all"
            >
              <TrendingDown size={15} />
              Process Refund
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function TimelineItem({
  icon, color, title, subtitle, date, done,
}: {
  icon: React.ReactNode
  color: string
  title: string
  subtitle?: string
  date?: string | null
  done: boolean
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/20 border-blue-500/40 text-blue-400",
    purple: "bg-purple-500/20 border-purple-500/40 text-purple-400",
    green: "bg-green-500/20 border-green-500/40 text-green-400",
    amber: "bg-amber-500/20 border-amber-500/40 text-amber-400",
    red: "bg-red-500/20 border-red-500/40 text-red-400",
    gray: "bg-gray-700 border-gray-600 text-gray-500",
  }
  return (
    <div className={`flex gap-3 ${done ? "" : "opacity-40"}`}>
      <div className={`relative z-10 w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 ${colorMap[color] ?? colorMap.gray}`}>
        {icon}
      </div>
      <div className="pt-0.5 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        {date && (
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
      </div>
    </div>
  )
}

// ---- Health Bar ------------------------------------------------------------

function HealthBar({ deposits }: { deposits: Deposit[] }) {
  const total = deposits.length
  if (total === 0) return null

  const heldCount = deposits.filter((d) => getStatusLabel(d) === "HELD").length
  const refundedCount = deposits.filter((d) => getStatusLabel(d) === "REFUNDED").length
  const overdueCount = deposits.filter((d) => getStatusLabel(d) === "OVERDUE").length
  const pendingCount = deposits.filter((d) => getStatusLabel(d) === "PENDING").length

  const pct = (n: number) => `${Math.round((n / total) * 100)}%`

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Deposit Portfolio Health</h3>
        <span className="text-xs text-gray-500">{total} total deposits</span>
      </div>
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
        {heldCount > 0 && (
          <div
            style={{ width: pct(heldCount) }}
            className="bg-gradient-to-r from-purple-500 to-violet-500 rounded-l-full transition-all"
            title={`Held: ${heldCount}`}
          />
        )}
        {refundedCount > 0 && (
          <div
            style={{ width: pct(refundedCount) }}
            className="bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
            title={`Refunded: ${refundedCount}`}
          />
        )}
        {overdueCount > 0 && (
          <div
            style={{ width: pct(overdueCount) }}
            className="bg-gradient-to-r from-red-500 to-rose-500 transition-all animate-pulse"
            title={`Overdue: ${overdueCount}`}
          />
        )}
        {pendingCount > 0 && (
          <div
            style={{ width: pct(pendingCount) }}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-r-full transition-all"
            title={`Pending: ${pendingCount}`}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-4 mt-3">
        {[
          { label: "Held", count: heldCount, color: "bg-purple-500" },
          { label: "Refunded", count: refundedCount, color: "bg-green-500" },
          { label: "Overdue", count: overdueCount, color: "bg-red-500" },
          { label: "Pending", count: pendingCount, color: "bg-amber-500" },
        ]
          .filter((s) => s.count > 0)
          .map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
              <span>{s.label}</span>
              <span className="text-white font-semibold">{s.count}</span>
              <span className="text-gray-600">({pct(s.count)})</span>
            </div>
          ))}
      </div>
    </div>
  )
}

// ---- CSV Export ------------------------------------------------------------

function exportCSV(deposits: Deposit[]) {
  const headers = ["Name", "Email", "Phone", "Unit", "Property", "Amount", "Status", "Paid Date", "Lease End", "Refund Amount", "Deductions"]
  const rows = deposits.map((d) => [
    d.tenantName,
    d.email,
    d.phone ?? "",
    d.unitNumber,
    d.propertyName,
    d.amount,
    getStatusLabel(d),
    d.paidDate ? new Date(d.paidDate).toLocaleDateString() : "",
    d.leaseEnd ? new Date(d.leaseEnd).toLocaleDateString() : "",
    d.refundAmount ?? "",
    d.deductionsTotal,
  ])
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `deposits-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---- Main Component --------------------------------------------------------

export default function DepositsClient({
  deposits,
  stats,
}: {
  deposits: Deposit[]
  stats: Stats
}) {
  const [search, setSearch] = useState("")
  const [property, setProperty] = useState("all")
  const [status, setStatus] = useState("all")
  const [sort, setSort] = useState("newest")
  const [activePanel, setActivePanel] = useState<Deposit | null>(null)

  const properties = useMemo(() => {
    const map = new Map<string, string>()
    deposits.forEach((d) => map.set(d.propertyId, d.propertyName))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [deposits])

  const filtered = useMemo(() => {
    let list = deposits.filter((d) => {
      const label = getStatusLabel(d)
      const matchSearch =
        !search ||
        d.tenantName.toLowerCase().includes(search.toLowerCase()) ||
        d.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
        d.propertyName.toLowerCase().includes(search.toLowerCase()) ||
        d.email.toLowerCase().includes(search.toLowerCase())
      const matchProp = property === "all" || d.propertyId === property
      const matchStatus = status === "all" || label === status
      return matchSearch && matchProp && matchStatus
    })

    list = [...list].sort((a, b) => {
      if (sort === "newest") return new Date(b.leaseStart ?? 0).getTime() - new Date(a.leaseStart ?? 0).getTime()
      if (sort === "highest") return b.amount - a.amount
      if (sort === "expiring") return (a.daysUntilExpiry ?? 9999) - (b.daysUntilExpiry ?? 9999)
      if (sort === "overdue") {
        const ao = getStatusLabel(a) === "OVERDUE" ? -1 : 1
        const bo = getStatusLabel(b) === "OVERDUE" ? -1 : 1
        return ao - bo
      }
      return 0
    })

    return list
  }, [deposits, search, property, status, sort])

  const hasFilters = search || property !== "all" || status !== "all"

  const clearFilters = () => {
    setSearch("")
    setProperty("all")
    setStatus("all")
  }

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Shield size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Security Deposits</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {fmt(stats.totalHeld)} held across {stats.heldCount} deposits
            </p>
          </div>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-all"
        >
          <ArrowDownToLine size={15} />
          Export CSV
        </button>
      </div>

      {/* ---- Hero Stats ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Held"
          value={fmt(stats.totalHeld)}
          sub={`${stats.heldCount} deposits`}
          color="purple"
          icon={<Shield size={18} />}
        />
        <StatCard
          label="Fully Collected"
          value={String(stats.heldCount - (stats.pendingCount ?? 0))}
          sub="HELD deposits"
          color="green"
          icon={<CheckCircle size={18} />}
        />
        <StatCard
          label="Pending Collection"
          value={String(stats.pendingCount ?? 0)}
          sub="not yet paid"
          color="amber"
          icon={<Clock size={18} />}
        />
        <StatCard
          label="Refunds Processed"
          value={fmt(stats.totalRefunded)}
          sub={`${stats.refundedCount} refunds`}
          color="teal"
          icon={<TrendingDown size={18} />}
        />
        <StatCard
          label="Damages Deducted"
          value={fmt(stats.totalDeductions)}
          sub={`${stats.pendingRefunds} overdue`}
          color="red"
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {/* ---- Health Bar ---- */}
      <HealthBar deposits={deposits} />

      {/* ---- Filters ---- */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, unit, property..."
              className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-colors"
            />
          </div>

          {/* Property */}
          <select
            value={property}
            onChange={(e) => setProperty(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="all">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="HELD">Held</option>
            <option value="PENDING">Pending</option>
            <option value="REFUNDED">Refunded</option>
            <option value="OVERDUE">Overdue</option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="newest">Newest</option>
            <option value="highest">Highest Amount</option>
            <option value="expiring">Expiring Soon</option>
            <option value="overdue">Overdue First</option>
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-gray-400 hover:text-white text-sm rounded-xl hover:bg-gray-700 transition-colors"
            >
              <X size={14} />
              Clear
            </button>
          )}

          <span className="ml-auto text-xs text-gray-500">
            <span className="text-purple-400 font-semibold">{filtered.length}</span> / {deposits.length}
          </span>
        </div>
      </div>

      {/* ---- Cards Grid ---- */}
      {filtered.length === 0 ? (
        <EmptyState hasFilters={!!hasFilters} onClear={clearFilters} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((deposit) => (
            <DepositCard
              key={deposit.id}
              deposit={deposit}
              onViewDetails={() => setActivePanel(deposit)}
            />
          ))}
        </div>
      )}

      {/* ---- Detail Panel ---- */}
      {activePanel && (
        <DetailPanel deposit={activePanel} onClose={() => setActivePanel(null)} />
      )}
    </div>
  )
}

// ---- StatCard ---------------------------------------------------------------

function StatCard({
  label, value, sub, color, icon,
}: {
  label: string
  value: string
  sub: string
  color: string
  icon: React.ReactNode
}) {
  const colorMap: Record<string, string> = {
    purple: "from-purple-500/10 to-pink-500/10 border-purple-500/25 text-purple-300",
    green: "from-green-500/10 to-emerald-500/10 border-green-500/25 text-green-300",
    amber: "from-amber-500/10 to-yellow-500/10 border-amber-500/25 text-amber-300",
    teal: "from-teal-500/10 to-cyan-500/10 border-teal-500/25 text-teal-300",
    red: "from-red-500/10 to-rose-500/10 border-red-500/25 text-red-300",
  }
  const cls = colorMap[color] ?? colorMap.purple
  const [gradientCls, borderCls, textCls] = cls.split(" ")

  return (
    <div className={`bg-gradient-to-br ${gradientCls} ${colorMap[color].includes("from-purple") ? "from-purple-500/10 to-pink-500/10" : ""} border ${borderCls} rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <span className={textCls}>{icon}</span>
      </div>
      <p className={`text-xl font-bold text-white font-mono leading-tight`}>{value}</p>
      <p className={`text-xs mt-1 ${textCls}`}>{sub}</p>
    </div>
  )
}

// ---- DepositCard -----------------------------------------------------------

function DepositCard({ deposit, onViewDetails }: { deposit: Deposit; onViewDetails: () => void }) {
  const statusLabel = getStatusLabel(deposit)
  const isOverdue = statusLabel === "OVERDUE"
  const isRefunded = statusLabel === "REFUNDED"

  const borderCls = isOverdue
    ? "border-red-500/30 hover:border-red-500/60 hover:shadow-red-500/10"
    : isRefunded
    ? "border-green-500/20 hover:border-green-500/40 hover:shadow-green-500/10"
    : "border-gray-700/60 hover:border-purple-500/40 hover:shadow-purple-500/10"

  const daysText = () => {
    if (deposit.daysUntilExpiry == null) return null
    if (isRefunded) return null
    if (deposit.daysUntilExpiry < 0)
      return (
        <span className="text-xs text-red-400 flex items-center gap-1">
          <AlertTriangle size={10} />
          Expired {Math.abs(deposit.daysUntilExpiry)} days ago
        </span>
      )
    if (deposit.daysUntilExpiry <= 30)
      return (
        <span className="text-xs text-amber-400 flex items-center gap-1">
          <AlertTriangle size={10} />
          Expires in {deposit.daysUntilExpiry} days
        </span>
      )
    return (
      <span className="text-xs text-gray-500 flex items-center gap-1">
        <Calendar size={10} />
        {deposit.daysUntilExpiry} days left
      </span>
    )
  }

  return (
    <div
      className={`relative bg-gray-800/40 border rounded-2xl p-5 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 cursor-default ${borderCls}`}
    >
      {/* Overdue badge */}
      {isOverdue && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded-full animate-pulse">
            ACTION REQUIRED
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(deposit.tenantName)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
          {initials(deposit.tenantName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-white font-semibold text-sm leading-tight truncate">{deposit.tenantName}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLES[statusLabel] ?? STATUS_STYLES.HELD}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
            <MapPin size={9} />
            Unit {deposit.unitNumber} · {deposit.propertyName}
          </p>
        </div>
      </div>

      {/* Amount */}
      <div className="bg-gradient-to-br from-purple-500/8 to-pink-500/8 border border-purple-500/20 rounded-xl px-4 py-3 mb-4">
        <p className="text-xs text-gray-500 mb-0.5">Deposit Amount</p>
        <p className="text-2xl font-bold text-purple-300 font-mono">{fmt(deposit.amount)}</p>
        {isRefunded && deposit.refundAmount != null && (
          <p className="text-xs text-green-400 mt-0.5">Refunded: {fmt(deposit.refundAmount)}</p>
        )}
        {deposit.deductionsTotal > 0 && (
          <p className="text-xs text-red-400 mt-0.5">Deducted: {fmt(deposit.deductionsTotal)}</p>
        )}
      </div>

      {/* Lifecycle dots */}
      <LifecycleDots deposit={deposit} />

      {/* Lease info */}
      <div className="mt-4 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Lease</span>
          <span className="text-gray-400">
            {deposit.leaseStart ? new Date(deposit.leaseStart).toLocaleDateString("en-KE", { month: "short", year: "numeric" }) : "N/A"}
            {" → "}
            {deposit.leaseEnd ? (
              <span className={isOverdue ? "text-red-400 font-semibold" : "text-gray-300"}>
                {new Date(deposit.leaseEnd).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}
              </span>
            ) : "N/A"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>{daysText()}</div>
          {deposit.hasAssessment && (
            <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
              <Wrench size={9} />
              {fmt(deposit.assessmentTotal)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onViewDetails}
          className="flex-1 py-2 text-xs font-medium text-gray-300 hover:text-white bg-gray-700/60 hover:bg-gray-700 rounded-xl transition-colors"
        >
          View Details
        </button>
        {statusLabel !== "REFUNDED" && (
          <Link
            href={`/dashboard/admin/deposit-refund?tenantId=${deposit.tenantId}`}
            className="flex-1 py-2 text-xs font-medium text-center text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl transition-all"
          >
            Process Refund
          </Link>
        )}
      </div>
    </div>
  )
}

// ---- EmptyState ------------------------------------------------------------

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-16 text-center">
      <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Shield size={28} className="text-gray-600" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">
        {hasFilters ? "No deposits match your filters" : "No security deposits found"}
      </h3>
      <p className="text-gray-500 text-sm mb-6">
        {hasFilters
          ? "Try adjusting your search or filters to see more results."
          : "Security deposits will appear here once tenants are onboarded."}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  )
}
