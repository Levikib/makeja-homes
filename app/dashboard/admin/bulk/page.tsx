"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FileText, Download, CheckCircle, AlertTriangle, RefreshCw, Calendar,
  DollarSign, Mail, ShieldCheck, X,
  Users, TrendingDown, Zap, AlertCircle, Send, Info,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

type Result = { success: boolean; message: string; detail?: string }
type Property = { id: string; name: string }
type PendingPayment = {
  id: string
  reference: string | null
  tenantName: string
  unitNumber: string
  propertyName: string
  amount: number
  method: string
  paidAt: string | null
  status: string
  verificationStatus: string | null
}
type BillStats = {
  total: number
  pending: number
  overdue: number
  unpaid: number
  paid: number
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Banner({ result, onDismiss }: { result: Result; onDismiss: () => void }) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border mb-6 ${
      result.success
        ? "bg-green-900/20 border-green-500/30 text-green-300"
        : "bg-red-900/20 border-red-500/30 text-red-300"
    }`}>
      {result.success
        ? <CheckCircle size={18} className="mt-0.5 shrink-0" />
        : <AlertTriangle size={18} className="mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{result.message}</p>
        {result.detail && <p className="text-xs mt-1 opacity-75">{result.detail}</p>}
      </div>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle, color }: {
  icon: React.ElementType; title: string; subtitle: string; color: string
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}

function Select({ value, onChange, children, disabled }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-purple-500 disabled:opacity-50 w-full"
    >
      {children}
    </select>
  )
}

function Input({ value, onChange, type = "text", placeholder, disabled }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string; disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-purple-500 disabled:opacity-50 w-full placeholder-gray-600"
    />
  )
}

function Btn({ onClick, disabled, loading, color, children, className = "" }: {
  onClick: () => void; disabled?: boolean; loading?: boolean; color: string; children: React.ReactNode; className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 ${color} disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${className}`}
    >
      {loading && <RefreshCw size={13} className="animate-spin" />}
      {children}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BulkOperationsPage() {
  const [result, setResult] = useState<Result | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [billStats, setBillStats] = useState<BillStats | null>(null)
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set())
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [loadingPayments, setLoadingPayments] = useState(false)

  // Bills
  const [billMonth, setBillMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })

  // Reminders
  const [reminderFilter, setReminderFilter] = useState<"all" | "property" | "tenant">("all")
  const [reminderProperty, setReminderProperty] = useState("all")
  const [reminderTenant, setReminderTenant] = useState("")
  const [confirmReminders, setConfirmReminders] = useState(false)

  // Verification
  const [verifyNotes, setVerifyNotes] = useState("")
  const [verifyAction, setVerifyAction] = useState<"APPROVED" | "REJECTED">("APPROVED")
  const [confirmVerify, setConfirmVerify] = useState(false)

  // Export — Payments
  const [expPayFrom, setExpPayFrom] = useState("")
  const [expPayTo, setExpPayTo] = useState("")
  const [expPayStatus, setExpPayStatus] = useState("all")
  const [expPayProperty, setExpPayProperty] = useState("all")
  const [expPayType, setExpPayType] = useState("all")
  const [expPayMethod, setExpPayMethod] = useState("all")

  // Export — Arrears
  const [expArrProp, setExpArrProp] = useState("all")
  const [expArrDays, setExpArrDays] = useState("0")

  // Export — Tenants
  const [expTenProp, setExpTenProp] = useState("all")
  const [expTenStatus, setExpTenStatus] = useState("all")

  // Overdue confirm
  const [confirmOverdue, setConfirmOverdue] = useState(false)

  // ── Data loaders ──────────────────────────────────────────────────────────

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch("/api/properties/all")
      if (res.ok) {
        const data = await res.json()
        setProperties(Array.isArray(data) ? data : (data.properties ?? []))
      }
    } catch {}
  }, [])

  const fetchBillStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bulk/stats")
      if (res.ok) {
        const data = await res.json()
        setBillStats(data)
      }
    } catch {}
  }, [])

  const fetchPendingPayments = useCallback(async () => {
    setLoadingPayments(true)
    try {
      const res = await fetch("/api/admin/payments/list?status=AWAITING_VERIFICATION&limit=100")
      if (res.ok) {
        const data = await res.json()
        const list = (data.payments ?? []).map((p: any) => ({
          id: p.id,
          reference: p.referenceNumber ?? p.reference ?? null,
          tenantName: p.tenants
            ? `${p.tenants.users?.firstName ?? ""} ${p.tenants.users?.lastName ?? ""}`.trim()
            : "—",
          unitNumber: p.tenants?.units?.unitNumber ?? "—",
          propertyName: p.tenants?.units?.properties?.name ?? "—",
          amount: Number(p.amount),
          method: p.paymentMethod ?? p.method ?? "—",
          paidAt: p.paidAt ?? null,
          status: p.status,
          verificationStatus: p.verificationStatus ?? null,
        }))
        setPendingPayments(list)
      }
    } catch {} finally {
      setLoadingPayments(false)
    }
  }, [])

  useEffect(() => {
    fetchProperties()
    fetchBillStats()
    fetchPendingPayments()
  }, [fetchProperties, fetchBillStats, fetchPendingPayments])

  // ── API helpers ───────────────────────────────────────────────────────────

  const run = async (key: string, body: object, onSuccess?: (data: any) => string) => {
    setLoadingKey(key)
    setResult(null)
    try {
      const res = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Request failed")
      const message = onSuccess ? onSuccess(data) : "Operation completed successfully"
      setResult({ success: true, message })
      return data
    } catch (err: any) {
      setResult({ success: false, message: err.message })
      return null
    } finally {
      setLoadingKey(null)
    }
  }

  const download = async (key: string, body: object, filename: string) => {
    setLoadingKey(key)
    setResult(null)
    try {
      const res = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Export failed")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${filename}-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setResult({ success: true, message: `${filename} downloaded successfully` })
    } catch (err: any) {
      setResult({ success: false, message: err.message })
    } finally {
      setLoadingKey(null)
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleGenerateBills = async () => {
    const [year, month] = billMonth.split("-").map(Number)
    const data = await run(
      "generate-bills",
      { action: "generate-bills", month, year },
      d => `Created ${d.created} bill${d.created !== 1 ? "s" : ""} — ${d.skipped} skipped`
    )
    if (data) fetchBillStats()
  }

  const handleMarkOverdue = async () => {
    setConfirmOverdue(false)
    const data = await run(
      "mark-bills-overdue",
      { action: "mark-bills-overdue" },
      d => `Marked ${d.updated} bill${d.updated !== 1 ? "s" : ""} as OVERDUE`
    )
    if (data) fetchBillStats()
  }

  const handleSendReminders = async () => {
    setConfirmReminders(false)
    const body: any = { action: "send-reminders" }
    if (reminderFilter === "property" && reminderProperty !== "all") body.propertyId = reminderProperty
    if (reminderFilter === "tenant" && reminderTenant.trim()) {
      // pass as search — we just pass it as tenantId array stub; server filters by status
      body.tenantIds = [reminderTenant.trim()]
    }
    await run(
      "send-reminders",
      body,
      d => `Sent ${d.sent} reminder${d.sent !== 1 ? "s" : ""} — ${d.failed} failed (${d.total} total)`
    )
  }

  const handleVerify = async () => {
    setConfirmVerify(false)
    if (selectedPayments.size === 0) {
      setResult({ success: false, message: "Select at least one payment" })
      return
    }
    const data = await run(
      "bulk-verify",
      {
        action: "bulk-verify-payments",
        ids: Array.from(selectedPayments),
        verificationStatus: verifyAction,
        verificationNotes: verifyNotes || undefined,
      },
      d => `${verifyAction === "APPROVED" ? "Approved" : "Rejected"} ${d.updated} payment${d.updated !== 1 ? "s" : ""}`
    )
    if (data) {
      setSelectedPayments(new Set())
      setVerifyNotes("")
      fetchPendingPayments()
    }
  }

  const togglePayment = (id: string) => {
    setSelectedPayments(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedPayments.size === pendingPayments.length) {
      setSelectedPayments(new Set())
    } else {
      setSelectedPayments(new Set(pendingPayments.map(p => p.id)))
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white pb-12">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Bulk Operations</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage bills, send reminders, verify payments, and export data
        </p>
      </div>

      {result && <Banner result={result} onDismiss={() => setResult(null)} />}

      <div className="space-y-8">

        {/* ── 1. Bills Management ─────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <SectionHeader
            icon={FileText}
            title="Bills Management"
            subtitle="Generate, update, and track monthly bills across all tenants"
            color="bg-purple-600/20 border border-purple-500/20"
          />

          {/* Stats row */}
          {billStats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              <StatCard label="Total Bills" value={billStats.total} color="text-white" />
              <StatCard label="Pending" value={billStats.pending} color="text-yellow-400" />
              <StatCard label="Unpaid" value={billStats.unpaid} color="text-orange-400" />
              <StatCard label="Overdue" value={billStats.overdue} color="text-red-400" />
              <StatCard label="Paid" value={billStats.paid} color="text-green-400" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Generate bills */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-purple-600/20 rounded-lg mt-0.5 border border-purple-500/20">
                  <Calendar size={15} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Generate Monthly Bills</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Auto-create bills for all tenants with active leases for the selected month.
                    Already-existing bills are skipped.
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1.5">Select Month</label>
                <input
                  type="month"
                  value={billMonth}
                  onChange={e => setBillMonth(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-purple-500 w-full"
                />
              </div>
              <Btn
                onClick={handleGenerateBills}
                loading={loadingKey === "generate-bills"}
                color="bg-purple-600 hover:bg-purple-700"
                className="w-full"
              >
                {loadingKey !== "generate-bills" && <Calendar size={14} />}
                Generate Bills
              </Btn>
            </div>

            {/* Mark overdue */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-amber-600/20 rounded-lg mt-0.5 border border-amber-500/20">
                  <AlertTriangle size={15} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Mark Overdue Bills</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Scan all PENDING and UNPAID bills whose due date has passed and update their
                    status to OVERDUE. Safe to run at any time.
                  </p>
                </div>
              </div>
              <div className="mb-4 bg-amber-900/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-xs text-amber-400 flex items-start gap-2">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  This scans all bills — not just the current month. Consider running this daily.
                </p>
              </div>
              {!confirmOverdue ? (
                <Btn
                  onClick={() => setConfirmOverdue(true)}
                  color="bg-amber-600 hover:bg-amber-700"
                  className="w-full"
                >
                  <AlertTriangle size={14} />
                  Run Overdue Check
                </Btn>
              ) : (
                <div className="flex gap-2">
                  <Btn
                    onClick={handleMarkOverdue}
                    loading={loadingKey === "mark-bills-overdue"}
                    color="bg-amber-600 hover:bg-amber-700"
                    className="flex-1"
                  >
                    Confirm
                  </Btn>
                  <Btn onClick={() => setConfirmOverdue(false)} color="bg-gray-700 hover:bg-gray-600" className="flex-1">
                    Cancel
                  </Btn>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 2. Payment Reminders ────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <SectionHeader
            icon={Mail}
            title="Payment Reminders"
            subtitle="Send email reminders to tenants with outstanding bills"
            color="bg-blue-600/20 border border-blue-500/20"
          />

          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {/* Filter type */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Send To</label>
                <Select value={reminderFilter} onChange={v => setReminderFilter(v as any)}>
                  <option value="all">All tenants with outstanding bills</option>
                  <option value="property">Filter by property</option>
                  <option value="tenant">Specific tenant ID</option>
                </Select>
              </div>

              {/* Property picker */}
              {reminderFilter === "property" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Property</label>
                  <Select value={reminderProperty} onChange={setReminderProperty}>
                    <option value="all">All properties</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Tenant ID input */}
              {reminderFilter === "tenant" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Tenant ID</label>
                  <Input
                    value={reminderTenant}
                    onChange={setReminderTenant}
                    placeholder="tenant_abc123..."
                  />
                </div>
              )}
            </div>

            <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-3 mb-5">
              <p className="text-xs text-blue-400 flex items-start gap-2">
                <Info size={12} className="mt-0.5 shrink-0" />
                Reminders are sent for bills with status PENDING, OVERDUE, or UNPAID. Each tenant
                receives one email per outstanding bill.
              </p>
            </div>

            {!confirmReminders ? (
              <Btn
                onClick={() => setConfirmReminders(true)}
                color="bg-blue-600 hover:bg-blue-700"
                className="w-full"
              >
                <Send size={14} />
                Send Reminders
              </Btn>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-amber-400 text-center font-medium">
                  Are you sure? This will send emails to all matching tenants.
                </p>
                <div className="flex gap-2">
                  <Btn
                    onClick={handleSendReminders}
                    loading={loadingKey === "send-reminders"}
                    color="bg-blue-600 hover:bg-blue-700"
                    className="flex-1"
                  >
                    Yes, Send Now
                  </Btn>
                  <Btn onClick={() => setConfirmReminders(false)} color="bg-gray-700 hover:bg-gray-600" className="flex-1">
                    Cancel
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── 3. Bulk Payment Verification ───────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-600/20 border border-green-500/20">
                <ShieldCheck size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Bulk Payment Verification</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Approve or reject multiple awaiting-verification payments at once
                </p>
              </div>
            </div>
            <button
              onClick={fetchPendingPayments}
              disabled={loadingPayments}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loadingPayments ? "animate-spin text-gray-400" : "text-gray-400"} />
            </button>
          </div>

          {loadingPayments ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <RefreshCw size={18} className="animate-spin mr-2" />
              <span className="text-sm">Loading payments...</span>
            </div>
          ) : pendingPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-600">
              <CheckCircle size={32} className="mb-3 text-green-700/50" />
              <p className="text-sm">No payments awaiting verification</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-800 mb-5">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/80">
                    <tr>
                      <th className="py-3 px-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedPayments.size === pendingPayments.length}
                          onChange={toggleAll}
                          className="accent-purple-500"
                        />
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-400">Tenant</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-400">Unit</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-400">Amount</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-400">Method</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-400">Reference</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {pendingPayments.map(p => (
                      <tr
                        key={p.id}
                        onClick={() => togglePayment(p.id)}
                        className={`cursor-pointer transition-colors ${
                          selectedPayments.has(p.id) ? "bg-purple-900/20" : "hover:bg-gray-800/40"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedPayments.has(p.id)}
                            onChange={() => togglePayment(p.id)}
                            onClick={e => e.stopPropagation()}
                            className="accent-purple-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-white font-medium">{p.tenantName}</td>
                        <td className="py-3 px-4 text-gray-400 text-xs">{p.unitNumber} · {p.propertyName}</td>
                        <td className="py-3 px-4 text-green-400 font-semibold">
                          KES {Number(p.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-gray-700/60 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                            {p.method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-xs font-mono">{p.reference ?? "—"}</td>
                        <td className="py-3 px-4 text-gray-500 text-xs">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-KE") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action bar */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-48">
                    <label className="block text-xs text-gray-500 mb-1.5">
                      Notes (optional)
                    </label>
                    <Input
                      value={verifyNotes}
                      onChange={setVerifyNotes}
                      placeholder="Verification notes..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Action</label>
                    <Select value={verifyAction} onChange={v => setVerifyAction(v as any)}>
                      <option value="APPROVED">Approve</option>
                      <option value="REJECTED">Reject</option>
                    </Select>
                  </div>
                  <div className="pt-5">
                    {!confirmVerify ? (
                      <Btn
                        onClick={() => {
                          if (selectedPayments.size === 0) {
                            setResult({ success: false, message: "Select at least one payment" })
                            return
                          }
                          setConfirmVerify(true)
                        }}
                        color={verifyAction === "APPROVED" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                      >
                        <ShieldCheck size={14} />
                        {verifyAction === "APPROVED" ? "Approve" : "Reject"} {selectedPayments.size > 0 ? `(${selectedPayments.size})` : "Selected"}
                      </Btn>
                    ) : (
                      <div className="flex gap-2">
                        <Btn
                          onClick={handleVerify}
                          loading={loadingKey === "bulk-verify"}
                          color={verifyAction === "APPROVED" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                        >
                          Confirm
                        </Btn>
                        <Btn onClick={() => setConfirmVerify(false)} color="bg-gray-700 hover:bg-gray-600">
                          Cancel
                        </Btn>
                      </div>
                    )}
                  </div>
                </div>
                {selectedPayments.size > 0 && (
                  <p className="text-xs text-purple-400 mt-2">
                    {selectedPayments.size} of {pendingPayments.length} payment{selectedPayments.size !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            </>
          )}
        </section>

        {/* ── 4. Export Data ──────────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <SectionHeader
            icon={Download}
            title="Export Data"
            subtitle="Download CSV reports for payments, arrears, and tenants"
            color="bg-cyan-600/20 border border-cyan-500/20"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Payments export */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={15} className="text-cyan-400" />
                <h3 className="text-sm font-semibold">Payments Export</h3>
              </div>
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">From Date</label>
                  <Input type="date" value={expPayFrom} onChange={setExpPayFrom} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">To Date</label>
                  <Input type="date" value={expPayTo} onChange={setExpPayTo} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Status</label>
                  <Select value={expPayStatus} onChange={setExpPayStatus}>
                    <option value="all">All statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING">Pending</option>
                    <option value="AWAITING_VERIFICATION">Awaiting Verification</option>
                    <option value="FAILED">Failed</option>
                    <option value="REFUNDED">Refunded</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Property</label>
                  <Select value={expPayProperty} onChange={setExpPayProperty}>
                    <option value="all">All properties</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Payment Type</label>
                  <Select value={expPayType} onChange={setExpPayType}>
                    <option value="all">All types</option>
                    <option value="RENT">Rent</option>
                    <option value="DEPOSIT">Deposit</option>
                    <option value="UTILITY">Utility</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Method</label>
                  <Select value={expPayMethod} onChange={setExpPayMethod}>
                    <option value="all">All methods</option>
                    <option value="M_PESA">M-Pesa</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="PAYSTACK">Paystack</option>
                    <option value="CHEQUE">Cheque</option>
                  </Select>
                </div>
              </div>
              <Btn
                onClick={() => download("export-payments-csv", {
                  action: "export-payments-csv",
                  from: expPayFrom || undefined,
                  to: expPayTo || undefined,
                  status: expPayStatus,
                  propertyId: expPayProperty,
                  paymentType: expPayType,
                  method: expPayMethod,
                }, "payments")}
                loading={loadingKey === "export-payments-csv"}
                color="bg-cyan-600 hover:bg-cyan-700"
                className="w-full"
              >
                {loadingKey !== "export-payments-csv" && <Download size={14} />}
                Download Payments CSV
              </Btn>
            </div>

            {/* Arrears export */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown size={15} className="text-red-400" />
                <h3 className="text-sm font-semibold">Arrears Export</h3>
              </div>
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Property</label>
                  <Select value={expArrProp} onChange={setExpArrProp}>
                    <option value="all">All properties</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Min Days Overdue</label>
                  <Select value={expArrDays} onChange={setExpArrDays}>
                    <option value="0">Any (include all)</option>
                    <option value="7">7+ days</option>
                    <option value="14">14+ days</option>
                    <option value="30">30+ days</option>
                    <option value="60">60+ days</option>
                    <option value="90">90+ days</option>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                Exports all bills with status OVERDUE, UNPAID, or PENDING where the due date has passed.
                Includes days overdue calculation.
              </p>
              <Btn
                onClick={() => download("export-arrears-csv", {
                  action: "export-arrears-csv",
                  propertyId: expArrProp,
                  minDaysOverdue: expArrDays === "0" ? undefined : Number(expArrDays),
                }, "arrears")}
                loading={loadingKey === "export-arrears-csv"}
                color="bg-red-700 hover:bg-red-800"
                className="w-full"
              >
                {loadingKey !== "export-arrears-csv" && <Download size={14} />}
                Download Arrears CSV
              </Btn>
            </div>

            {/* Tenants export */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users size={15} className="text-purple-400" />
                <h3 className="text-sm font-semibold">Tenants Export</h3>
              </div>
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Property</label>
                  <Select value={expTenProp} onChange={setExpTenProp}>
                    <option value="all">All properties</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Tenant Status</label>
                  <Select value={expTenStatus} onChange={setExpTenStatus}>
                    <option value="all">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="PENDING">Pending</option>
                    <option value="SUSPENDED">Suspended</option>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                Exports tenant names, emails, phones, units, rent amounts, deposit amounts, and move-in dates.
              </p>
              <Btn
                onClick={() => download("export-tenants-csv", {
                  action: "export-tenants-csv",
                  propertyId: expTenProp,
                  status: expTenStatus,
                }, "tenants")}
                loading={loadingKey === "export-tenants-csv"}
                color="bg-purple-600 hover:bg-purple-700"
                className="w-full"
              >
                {loadingKey !== "export-tenants-csv" && <Download size={14} />}
                Download Tenants CSV
              </Btn>
            </div>
          </div>
        </section>

        {/* ── 5. Danger Zone ──────────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-red-900/30 rounded-2xl p-6">
          <SectionHeader
            icon={AlertCircle}
            title="Danger Zone"
            subtitle="Irreversible bulk operations — use with caution"
            color="bg-red-600/20 border border-red-500/20"
          />

          <div className="bg-gray-800/50 border border-red-900/30 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-300">Mark All Past-Due Bills as Overdue</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Immediately updates every PENDING and UNPAID bill whose due date is in the past to OVERDUE status.
                  This affects all properties and all months. This action cannot be undone in bulk.
                </p>
              </div>
              <div className="shrink-0">
                {!confirmOverdue ? (
                  <Btn
                    onClick={() => setConfirmOverdue(true)}
                    color="bg-red-700/80 hover:bg-red-700 border border-red-600/50"
                  >
                    <Zap size={14} />
                    Mark All Overdue
                  </Btn>
                ) : (
                  <div className="flex gap-2">
                    <Btn
                      onClick={handleMarkOverdue}
                      loading={loadingKey === "mark-bills-overdue"}
                      color="bg-red-600 hover:bg-red-700"
                    >
                      Confirm
                    </Btn>
                    <Btn onClick={() => setConfirmOverdue(false)} color="bg-gray-700 hover:bg-gray-600">
                      Cancel
                    </Btn>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
