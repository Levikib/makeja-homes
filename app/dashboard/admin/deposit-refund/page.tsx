"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import {
  Shield, CheckCircle, AlertTriangle, DollarSign, Wrench,
  Save, Plus, X, ChevronDown, ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

const fmt = (n: number) => `KSh ${Math.round(n || 0).toLocaleString()}`

// ---- Damage Assessment Form -----------------------------------------------

interface DamageItem {
  _id: string
  description: string
  damageType: string
  estimatedCost: number
}

function AssessmentSection({
  tenantId,
  assessment,
  onAssessmentSaved,
}: {
  tenantId: string
  assessment: any
  onAssessmentSaved: (assessment: any) => void
}) {
  const [mode, setMode] = useState<"view" | "add">(assessment ? "view" : "add")
  const [items, setItems] = useState<DamageItem[]>([
    { _id: "1", description: "", damageType: "OTHER", estimatedCost: 0 },
  ])
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const totalLocal = items.reduce((s, i) => s + Number(i.estimatedCost || 0), 0)

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { _id: Date.now().toString(), description: "", damageType: "OTHER", estimatedCost: 0 },
    ])

  const removeItem = (id: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i._id !== id) : prev))

  const updateItem = (id: string, field: keyof DamageItem, value: any) =>
    setItems((prev) => prev.map((i) => (i._id === id ? { ...i, [field]: value } : i)))

  const saveAssessment = async () => {
    const validItems = items.filter((i) => i.description.trim() && i.estimatedCost > 0)
    if (validItems.length === 0) {
      setErr("Add at least one damage item with a description and cost.")
      return
    }
    setSaving(true)
    setErr("")
    try {
      const res = await fetch("/api/admin/deposits/assessment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId, items: validItems, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to save assessment")
      onAssessmentSaved(data.assessment)
      setMode("view")
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (mode === "view" && assessment) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Wrench size={14} className="text-amber-400" />
            Damage Assessment
          </h3>
          <button
            onClick={() => setMode("add")}
            className="text-xs text-purple-400 hover:text-purple-300 border border-purple-500/30 hover:border-purple-500/50 rounded-lg px-2.5 py-1 transition-colors"
          >
            Edit / Add More
          </button>
        </div>
        <div className="space-y-2 mb-3">
          {(assessment.damage_items ?? []).map((item: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm border-b border-gray-800 pb-2 last:border-0"
            >
              <div>
                <span className="text-gray-300">{item.description ?? item.damageType}</span>
                <span className="ml-2 text-xs text-gray-600 uppercase">{item.damageType}</span>
              </div>
              <span className="text-red-400 font-mono font-semibold">
                {fmt(Number(item.estimatedCost ?? 0))}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm font-semibold border-t border-gray-700 pt-2.5">
          <span className="text-gray-300">Total damage cost</span>
          <span className="text-red-400 font-mono">{fmt(Number(assessment.totalDamageCost ?? 0))}</span>
        </div>
        {assessment.notes && (
          <p className="text-xs text-gray-500 mt-2 italic">{assessment.notes}</p>
        )}
      </div>
    )
  }

  // Add mode
  return (
    <div className="bg-gray-900 border border-amber-500/20 rounded-2xl p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Wrench size={14} className="text-amber-400" />
          {assessment ? "Add More Damage Items" : "Record Damage Assessment"}
        </h3>
        {assessment && (
          <button onClick={() => setMode("view")} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Cancel
          </button>
        )}
      </div>

      {err && <p className="text-red-400 text-xs mb-3 bg-red-900/20 border border-red-500/20 rounded-lg p-2">{err}</p>}

      <div className="space-y-3 mb-3">
        {items.map((item) => (
          <div key={item._id} className="bg-gray-800/60 rounded-xl p-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateItem(item._id, "description", e.target.value)}
                placeholder="Damage description (e.g. Broken window pane)"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-amber-500/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeItem(item._id)}
                className="p-2 text-gray-600 hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={item.damageType}
                onChange={(e) => updateItem(item._id, "damageType", e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 focus:border-amber-500/50 focus:outline-none"
              >
                <option value="OTHER">Other</option>
                <option value="STRUCTURAL">Structural</option>
                <option value="PLUMBING">Plumbing</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="PAINTING">Painting</option>
                <option value="CLEANING">Cleaning</option>
                <option value="APPLIANCE">Appliance</option>
                <option value="FURNITURE">Furniture</option>
              </select>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">KSh</span>
                <input
                  type="number"
                  value={item.estimatedCost || ""}
                  onChange={(e) => updateItem(item._id, "estimatedCost", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min={0}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="w-full py-2 text-xs font-medium text-amber-400 border border-amber-500/20 hover:border-amber-500/40 rounded-xl hover:bg-amber-500/5 transition-all flex items-center justify-center gap-1.5 mb-4"
      >
        <Plus size={13} />
        Add damage item
      </button>

      {totalLocal > 0 && (
        <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-3 mb-4 flex justify-between text-sm">
          <span className="text-gray-400">Assessment total</span>
          <span className="text-red-400 font-bold font-mono">{fmt(totalLocal)}</span>
        </div>
      )}

      <div className="mb-4">
        <label className="text-xs text-gray-500 block mb-1.5">Assessment Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Inspection notes, references..."
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none resize-none"
        />
      </div>

      <button
        type="button"
        onClick={saveAssessment}
        disabled={saving}
        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
      >
        <Save size={13} className={saving ? "animate-pulse" : ""} />
        {saving ? "Saving..." : "Save Assessment"}
      </button>
    </div>
  )
}

// ---- Refund Breakdown Bar --------------------------------------------------

function RefundBreakdownBar({
  depositAmount,
  damages,
  manualDeduction,
}: {
  depositAmount: number
  damages: number
  manualDeduction: number
}) {
  if (depositAmount === 0) return null
  const totalDeductions = damages + manualDeduction
  const refundAmount = Math.max(0, depositAmount - totalDeductions)
  const damagePct = Math.min(100, (damages / depositAmount) * 100)
  const manualPct = Math.min(100 - damagePct, (manualDeduction / depositAmount) * 100)
  const refundPct = 100 - damagePct - manualPct

  return (
    <div className="mb-5">
      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
        <span>Deposit breakdown</span>
        <span>{fmt(depositAmount)} total</span>
      </div>
      <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
        {damages > 0 && (
          <div
            style={{ width: `${damagePct}%` }}
            className="bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-center"
            title={`Damage: ${fmt(damages)}`}
          >
            {damagePct > 12 && <span className="text-[9px] text-white font-bold truncate px-1">Damage</span>}
          </div>
        )}
        {manualDeduction > 0 && (
          <div
            style={{ width: `${manualPct}%` }}
            className="bg-gradient-to-r from-orange-600 to-orange-500 flex items-center justify-center"
            title={`Extra: ${fmt(manualDeduction)}`}
          >
            {manualPct > 12 && <span className="text-[9px] text-white font-bold truncate px-1">Extra</span>}
          </div>
        )}
        <div
          style={{ width: `${Math.max(refundPct, 0)}%` }}
          className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-r-full flex items-center justify-center flex-1"
          title={`Refund: ${fmt(refundAmount)}`}
        >
          {refundPct > 15 && <span className="text-[9px] text-white font-bold truncate px-1">Refund</span>}
        </div>
      </div>
      <div className="flex gap-4 mt-2">
        {damages > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            Damage {fmt(damages)}
          </div>
        )}
        {manualDeduction > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            Extra {fmt(manualDeduction)}
          </div>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          Refund {fmt(refundAmount)}
        </div>
      </div>
    </div>
  )
}

// ---- Main Page Content ----------------------------------------------------

function DepositRefundContent() {
  const searchParams = useSearchParams()
  const tenantId = searchParams.get("tenantId")

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deductions, setDeductions] = useState("")
  const [notes, setNotes] = useState("")
  const [refundMethod, setRefundMethod] = useState("MPESA")
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!tenantId) return
    setLoading(true)
    fetch(`/api/admin/deposit-refund?tenantId=${tenantId}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [tenantId])

  const heldAmount = data?.summary?.heldAmount ?? 0
  const totalDamage = data?.summary?.totalDamage ?? 0
  const manualDeduction = Number(deductions || 0)
  const totalDeduction = totalDamage + manualDeduction
  const refundAmount = Math.max(0, heldAmount - totalDeduction)

  const handleAssessmentSaved = (savedAssessment: any) => {
    setData((prev: any) => ({
      ...prev,
      assessment: savedAssessment,
      summary: {
        ...prev?.summary,
        totalDamage: savedAssessment.totalDamageCost ?? 0,
        refundable: Math.max(0, (prev?.summary?.heldAmount ?? 0) - (savedAssessment.totalDamageCost ?? 0)),
      },
    }))
  }

  const handleRefund = async () => {
    setSaving(true)
    setError("")
    const res = await fetch("/api/admin/deposit-refund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId, deductions: totalDeduction, notes, refundMethod }),
    })
    const result = await res.json()
    if (!res.ok) setError(result.error ?? "Failed")
    else setDone(true)
    setSaving(false)
  }

  if (!tenantId)
    return (
      <p className="text-gray-400 p-6">
        No tenant selected.{" "}
        <Link href="/dashboard/admin/deposits" className="text-purple-400 underline">
          Go back to deposits
        </Link>
      </p>
    )

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  if (done)
    return (
      <div className="max-w-lg mx-auto text-center py-16 text-white">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">Deposit Refund Processed</h2>
        <p className="text-gray-400 mb-2">
          Refund of{" "}
          <span className="text-green-400 font-mono font-bold">{fmt(refundAmount)}</span> has been
          recorded.
        </p>
        {totalDeduction > 0 && (
          <p className="text-sm text-gray-500 mb-6">
            Total deductions: <span className="text-red-400 font-mono">{fmt(totalDeduction)}</span>
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard/admin/deposits"
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Back to Deposits
          </Link>
          <Link
            href="/dashboard/admin/vacate"
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
          >
            Vacate Notices
          </Link>
        </div>
      </div>
    )

  const alreadyRefunded = data?.deposit?.status === "REFUNDED"

  return (
    <div className="text-white max-w-2xl">
      {/* Page header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/admin/deposits"
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Security Deposit Refund</h1>
            <p className="text-gray-400 text-sm">
              Review damage assessment and process tenant refund
            </p>
          </div>
        </div>
      </div>

      {alreadyRefunded && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 mb-5 flex items-center gap-3">
          <CheckCircle size={16} className="text-green-400" />
          <p className="text-green-300 text-sm">
            Deposit has already been refunded.{" "}
            <span className="font-semibold">Refund: {fmt(data.deposit.refundAmount ?? 0)}</span>,
            Deductions: {fmt(data.deposit.deductionsTotal ?? 0)}
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Deposit Held", value: fmt(heldAmount), color: "purple" },
          {
            label: "Damage Assessed",
            value: fmt(totalDamage),
            color: totalDamage > 0 ? "red" : "green",
          },
          {
            label: "Refundable",
            value: fmt(Math.max(0, heldAmount - totalDeduction)),
            color: "green",
          },
        ].map(({ label, value, color }) => {
          const colors: Record<string, string> = {
            purple: "border-purple-500/20 from-purple-500/10",
            green: "border-green-500/20 from-green-500/10",
            red: "border-red-500/20 from-red-500/10",
          }
          return (
            <div
              key={label}
              className={`bg-gradient-to-br ${colors[color]} to-transparent border rounded-xl p-4 text-center`}
            >
              <p className="text-gray-400 text-xs mb-1">{label}</p>
              <p className="text-lg font-bold font-mono">{value}</p>
            </div>
          )
        })}
      </div>

      {/* Damage assessment section */}
      {tenantId && (
        <AssessmentSection
          tenantId={tenantId}
          assessment={data?.assessment}
          onAssessmentSaved={handleAssessmentSaved}
        />
      )}

      {/* Refund breakdown visual */}
      {!alreadyRefunded && heldAmount > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Activity size={14} className="text-blue-400" />
            Refund Breakdown
          </h3>
          <RefundBreakdownBar
            depositAmount={heldAmount}
            damages={totalDamage}
            manualDeduction={manualDeduction}
          />
        </div>
      )}

      {/* Refund form */}
      {!alreadyRefunded && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <DollarSign size={14} className="text-green-400" />
            Process Refund
          </h3>
          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-500/20 rounded-lg p-2">
              {error}
            </p>
          )}

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">
              Additional Deductions (KSh)
            </label>
            <input
              type="number"
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
              min={0}
              max={heldAmount}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
              placeholder="0"
            />
            <p className="text-xs text-gray-600 mt-1">
              Beyond the damage assessment — e.g. cleaning fees, unpaid utilities
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Refund Method</label>
            <select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none transition-colors"
            >
              <option value="MPESA">M-Pesa</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none transition-colors"
              placeholder="Reason for deductions, reference numbers..."
            />
          </div>

          {/* Live summary */}
          <div className="bg-black/20 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Deposit held</span>
              <span className="font-mono">{fmt(heldAmount)}</span>
            </div>
            {totalDamage > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Damage assessed</span>
                <span className="text-red-400 font-mono">- {fmt(totalDamage)}</span>
              </div>
            )}
            {manualDeduction > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Additional deductions</span>
                <span className="text-red-400 font-mono">- {fmt(manualDeduction)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-gray-700 pt-2">
              <span>Refund to tenant</span>
              <span className="text-green-400 font-mono text-base">{fmt(refundAmount)}</span>
            </div>
          </div>

          <button
            onClick={handleRefund}
            disabled={saving || refundAmount < 0}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-green-900/30"
          >
            <Save size={15} className={saving ? "animate-pulse" : ""} />
            {saving ? "Processing..." : `Confirm Refund of ${fmt(refundAmount)}`}
          </button>
        </div>
      )}
    </div>
  )
}

export default function DepositRefundPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DepositRefundContent />
    </Suspense>
  )
}
