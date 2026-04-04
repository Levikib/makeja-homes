"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Shield, CheckCircle, AlertTriangle, DollarSign, Wrench, Save } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

const fmt = (n: number) => `KSh ${Math.round(n || 0).toLocaleString()}`

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

  const handleRefund = async () => {
    setSaving(true); setError("")
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

  if (!tenantId) return <p className="text-gray-400 p-6">No tenant selected. Go back and pick a tenant.</p>
  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>

  if (done) return (
    <div className="max-w-lg mx-auto text-center py-16 text-white">
      <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">Deposit Refund Processed</h2>
      <p className="text-gray-400 mb-6">Refund of {fmt(refundAmount)} has been recorded.</p>
      <Link href="/dashboard/admin/vacate" className="text-purple-400 underline text-sm">← Back to vacate notices</Link>
    </div>
  )

  const alreadyRefunded = data?.deposit?.status === 'REFUNDED'

  return (
    <div className="text-white max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Security Deposit Refund</h1>
          <p className="text-gray-400 text-sm">Review damage assessment and process tenant refund</p>
        </div>
      </div>

      {alreadyRefunded && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 mb-5 flex items-center gap-3">
          <CheckCircle size={16} className="text-green-400" />
          <p className="text-green-300 text-sm">Deposit has already been refunded. Refund: {fmt(data.deposit.refundAmount ?? 0)}, Deductions: {fmt(data.deposit.deductionsTotal ?? 0)}</p>
        </div>
      )}

      {/* Deposit summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Deposit Held", value: fmt(heldAmount), color: "purple" },
          { label: "Damage Assessed", value: fmt(totalDamage), color: totalDamage > 0 ? "red" : "green" },
          { label: "Refundable", value: fmt(Math.max(0, heldAmount - totalDeduction)), color: "green" },
        ].map(({ label, value, color }) => {
          const colors: Record<string, string> = { purple: "border-purple-500/20 from-purple-500/10", green: "border-green-500/20 from-green-500/10", red: "border-red-500/20 from-red-500/10" }
          return (
            <div key={label} className={`bg-gradient-to-br ${colors[color]} to-transparent border rounded-xl p-4 text-center`}>
              <p className="text-gray-400 text-xs mb-1">{label}</p>
              <p className="text-lg font-bold">{value}</p>
            </div>
          )
        })}
      </div>

      {/* Damage assessment */}
      {data?.assessment ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Wrench size={14} className="text-amber-400" /> Damage Assessment</h3>
          <div className="space-y-2 mb-3">
            {(data.assessment.damage_items ?? []).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-gray-800 pb-2 last:border-0">
                <span className="text-gray-300">{item.description ?? item.damageType}</span>
                <span className="text-red-400">{fmt(Number(item.estimatedCost ?? item.repairCost ?? 0))}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-gray-700 pt-2">
            <span className="text-gray-300">Total damage cost</span>
            <span className="text-red-400">{fmt(totalDamage)}</span>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle size={15} className="text-amber-400" />
          <p className="text-amber-300 text-sm">No damage assessment on record. You can still apply manual deductions below.</p>
        </div>
      )}

      {/* Refund form */}
      {!alreadyRefunded && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2"><DollarSign size={14} className="text-green-400" /> Process Refund</h3>
          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Additional Deductions (KSh)</label>
            <input type="number" value={deductions} onChange={(e) => setDeductions(e.target.value)} min={0} max={heldAmount}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              placeholder="0" />
            <p className="text-xs text-gray-600 mt-1">Additional deductions beyond the damage assessment (e.g. cleaning, unpaid utilities)</p>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Refund Method</label>
            <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none">
              <option value="MPESA">M-Pesa</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
              placeholder="Reason for deductions, reference numbers..." />
          </div>

          {/* Summary */}
          <div className="bg-black/20 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Deposit held</span><span>{fmt(heldAmount)}</span></div>
            {totalDamage > 0 && <div className="flex justify-between"><span className="text-gray-400">Damage assessed</span><span className="text-red-400">- {fmt(totalDamage)}</span></div>}
            {manualDeduction > 0 && <div className="flex justify-between"><span className="text-gray-400">Additional deductions</span><span className="text-red-400">- {fmt(manualDeduction)}</span></div>}
            <div className="flex justify-between font-bold border-t border-gray-700 pt-2">
              <span>Refund to tenant</span>
              <span className="text-green-400">{fmt(refundAmount)}</span>
            </div>
          </div>

          <button onClick={handleRefund} disabled={saving || refundAmount < 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition">
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
    <Suspense fallback={<div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <DepositRefundContent />
    </Suspense>
  )
}
