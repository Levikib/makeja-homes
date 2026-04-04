"use client"

import { useState, useEffect, useCallback } from "react"
import { LogOut, Clock, CheckCircle, XCircle, CalendarDays, User, Building2, RefreshCw, Plus, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"

type NoticeStatus = "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED"

interface VacateNotice {
  id: string
  status: NoticeStatus
  intendedVacateDate: string
  actualVacateDate: string | null
  assessmentScheduled: boolean
  assessmentDate: string | null
  reason: string | null
  createdAt: string
  tenants: {
    id: string
    users: { firstName: string; lastName: string; email: string; phoneNumber: string | null }
    units: { unitNumber: string; properties: { id: string; name: string } }
  }
}

const STATUS_CONFIG: Record<NoticeStatus, { label: string; color: string; icon: any }> = {
  PENDING: { label: "Pending", color: "bg-amber-900/30 text-amber-300 border-amber-500/30", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-blue-900/30 text-blue-300 border-blue-500/30", icon: CheckCircle },
  COMPLETED: { label: "Completed", color: "bg-green-900/30 text-green-300 border-green-500/30", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "bg-gray-800 text-gray-500 border-gray-700", icon: XCircle },
}

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—"

export default function VacateNoticesPage() {
  const [notices, setNotices] = useState<VacateNotice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<NoticeStatus | "ALL">("ALL")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filter !== "ALL" ? `?status=${filter}` : ""
      const res = await fetch(`/api/admin/vacate${params}`)
      const data = await res.json()
      setNotices(data.notices ?? [])
    } catch {}
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const act = async (noticeId: string, action: string, extra?: Record<string, string>) => {
    setActing(noticeId)
    try {
      const res = await fetch("/api/admin/vacate", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ noticeId, action, ...extra }),
      })
      if (res.ok) load()
    } catch {}
    setActing(null)
  }

  const filtered = filter === "ALL" ? notices : notices.filter((n) => n.status === filter)
  const pending = notices.filter((n) => n.status === "PENDING").length

  return (
    <div className="text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><LogOut size={20} className="text-purple-400" /> Vacate Notices</h1>
          <p className="text-gray-400 text-sm mt-1">Manage tenant vacate requests and property handovers</p>
        </div>
        <button onClick={() => setShowNewForm(!showNewForm)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          <Plus size={15} /> New Notice
        </button>
      </div>

      {/* New notice form */}
      {showNewForm && <NewNoticeForm onCreated={() => { setShowNewForm(false); load() }} />}

      {/* Alerts */}
      {pending > 0 && (
        <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-500/30 rounded-xl px-4 py-3 mb-4">
          <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">{pending} notice{pending > 1 ? "s" : ""} awaiting approval</p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 overflow-x-auto">
        {(["ALL", "PENDING", "APPROVED", "COMPLETED", "CANCELLED"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${filter === s ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}>
            {s === "ALL" ? `All (${notices.length})` : `${s[0]}${s.slice(1).toLowerCase()} (${notices.filter((n) => n.status === s).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-gray-700 rounded-2xl p-12 text-center">
          <LogOut size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No vacate notices found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notice) => {
            const cfg = STATUS_CONFIG[notice.status]
            const StatusIcon = cfg.icon
            const isOpen = expanded === notice.id
            return (
              <div key={notice.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <button className="w-full text-left px-5 py-4" onClick={() => setExpanded(isOpen ? null : notice.id)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User size={15} className="text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold">{notice.tenants.users.firstName} {notice.tenants.users.lastName}</p>
                        <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1.5">
                          <Building2 size={11} /> {notice.tenants.units.properties.name} · Unit {notice.tenants.units.unitNumber}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1.5">
                          <CalendarDays size={11} /> Vacating: {fmtDate(notice.intendedVacateDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 ${cfg.color}`}>
                        <StatusIcon size={11} /> {cfg.label}
                      </span>
                      {isOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 space-y-4 border-t border-gray-800 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div><p className="text-gray-500 text-xs mb-0.5">Email</p><p className="text-gray-300">{notice.tenants.users.email}</p></div>
                      <div><p className="text-gray-500 text-xs mb-0.5">Phone</p><p className="text-gray-300">{notice.tenants.users.phoneNumber ?? "—"}</p></div>
                      <div><p className="text-gray-500 text-xs mb-0.5">Notice Date</p><p className="text-gray-300">{fmtDate(notice.createdAt)}</p></div>
                      <div><p className="text-gray-500 text-xs mb-0.5">Intended Vacate</p><p className="text-gray-300">{fmtDate(notice.intendedVacateDate)}</p></div>
                      {notice.assessmentDate && <div><p className="text-gray-500 text-xs mb-0.5">Inspection Date</p><p className="text-gray-300">{fmtDate(notice.assessmentDate)}</p></div>}
                      {notice.actualVacateDate && <div><p className="text-gray-500 text-xs mb-0.5">Actual Vacate</p><p className="text-gray-300">{fmtDate(notice.actualVacateDate)}</p></div>}
                      {notice.reason && <div className="sm:col-span-2"><p className="text-gray-500 text-xs mb-0.5">Reason</p><p className="text-gray-300">{notice.reason}</p></div>}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {notice.status === "PENDING" && (
                        <>
                          <button disabled={acting === notice.id} onClick={() => act(notice.id, "approve")}
                            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50">
                            Approve
                          </button>
                          <button disabled={acting === notice.id} onClick={() => act(notice.id, "cancel")}
                            className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50">
                            Cancel
                          </button>
                        </>
                      )}
                      {notice.status === "APPROVED" && !notice.assessmentScheduled && (
                        <ScheduleInspectionForm noticeId={notice.id} onDone={() => { act(notice.id, "schedule", { assessmentDate: '' }) ; load() }} />
                      )}
                      {notice.status === "APPROVED" && (
                        <>
                          <button disabled={acting === notice.id} onClick={() => act(notice.id, "complete")}
                            className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50">
                            Mark Completed
                          </button>
                          <Link href={`/dashboard/admin/deposit-refund?tenantId=${notice.tenants.id}`}
                            className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition">
                            Process Refund
                          </Link>
                        </>
                      )}
                      {notice.status === "COMPLETED" && (
                        <Link href={`/dashboard/admin/deposit-refund?tenantId=${notice.tenants.id}`}
                          className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition">
                          View Deposit Refund
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NewNoticeForm({ onCreated }: { onCreated: () => void }) {
  const [tenants, setTenants] = useState<any[]>([])
  const [form, setForm] = useState({ tenantId: "", intendedVacateDate: "", reason: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/tenants").then((r) => r.json()).then((d) => setTenants(d ?? [])).catch(() => {})
  }, [])

  const submit = async () => {
    if (!form.tenantId || !form.intendedVacateDate) { setError("Tenant and vacate date required"); return }
    setSaving(true); setError("")
    const res = await fetch("/api/admin/vacate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? "Failed to create")
    else onCreated()
    setSaving(false)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
      <h3 className="font-semibold text-sm mb-4">Create Vacate Notice</h3>
      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Tenant *</label>
          <select value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none">
            <option value="">Select tenant...</option>
            {tenants.map((t: any) => (
              <option key={t.id} value={t.id}>{t.users?.firstName} {t.users?.lastName} — {t.units?.unitNumber}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Intended Vacate Date *</label>
          <input type="date" value={form.intendedVacateDate} onChange={(e) => setForm({ ...form, intendedVacateDate: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-gray-400 block mb-1">Reason (optional)</label>
          <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none resize-none"
            placeholder="Reason for vacating..." />
        </div>
      </div>
      <button onClick={submit} disabled={saving}
        className="text-sm px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition disabled:opacity-50">
        {saving ? "Creating..." : "Create Notice"}
      </button>
    </div>
  )
}

function ScheduleInspectionForm({ noticeId, onDone }: { noticeId: string; onDone: () => void }) {
  const [date, setDate] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!date) return
    setSaving(true)
    await fetch("/api/admin/vacate", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ noticeId, action: "schedule", assessmentDate: date }) })
    setSaving(false)
    onDone()
  }

  return (
    <div className="flex items-center gap-2">
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:border-purple-500 focus:outline-none" />
      <button onClick={submit} disabled={saving || !date}
        className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition disabled:opacity-50">
        Schedule Inspection
      </button>
    </div>
  )
}
