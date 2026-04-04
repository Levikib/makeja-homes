"use client"

import { useState, useEffect } from "react"
import { FileText, CheckCircle, Clock, Calendar, DollarSign, Home, PenLine, Download } from "lucide-react"
import Link from "next/link"

const fmt = (n: number) => `KES ${Math.round(n || 0).toLocaleString()}`
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "—"

export default function TenantLeasePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/tenant/lease")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) {
          // API returns flat format — normalise for the component
          setData({
            lease: {
              id: d.id,
              status: d.status,
              startDate: d.startDate,
              endDate: d.endDate,
              rentAmount: d.rentAmount,
              depositAmount: d.depositAmount,
              contractTerms: d.contractTerms ?? d.terms,
              contractSignedAt: d.contractSignedAt,
              signatureToken: null, // not returned by this API — link handled separately
            },
            tenant: d.tenant,
            unit: { unitNumber: d.unit?.unitNumber, properties: { name: d.property?.name } },
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const lease = data?.lease
  const tenant = data?.tenant
  const unit = data?.unit

  if (!lease) return (
    <div className="text-white text-center py-16">
      <FileText size={40} className="text-gray-600 mx-auto mb-4" />
      <p className="text-gray-400">No active lease found.</p>
    </div>
  )

  const now = new Date()
  const end = new Date(lease.endDate)
  const start = new Date(lease.startDate)
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const progress = Math.min(100, Math.max(0, Math.round(((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100)))

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-900/30 text-green-300 border-green-500/30",
    PENDING: "bg-amber-900/30 text-amber-300 border-amber-500/30",
    TERMINATED: "bg-red-900/30 text-red-300 border-red-500/30",
    EXPIRED: "bg-gray-800 text-gray-400 border-gray-700",
  }

  return (
    <div className="text-white space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText size={20} className="text-purple-400" /> My Lease</h1>
        <p className="text-gray-400 text-sm mt-1">Current lease agreement and property details</p>
      </div>

      {/* Lease status card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Current Lease</p>
            <p className="text-white font-bold text-lg">{unit?.properties?.name ?? "—"} · Unit {unit?.unitNumber}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full border ${statusColor[lease.status] ?? statusColor.ACTIVE}`}>
            {lease.status}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>{fmtDate(lease.startDate)}</span>
            <span className={daysLeft <= 30 ? "text-amber-400" : "text-gray-500"}>{daysLeft} days remaining</span>
            <span>{fmtDate(lease.endDate)}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${daysLeft <= 30 ? "bg-amber-500" : "bg-purple-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Key details */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Monthly Rent", value: fmt(lease.rentAmount), icon: DollarSign, color: "text-green-400" },
            { label: "Security Deposit", value: fmt(lease.depositAmount), icon: DollarSign, color: "text-purple-400" },
            { label: "Lease Start", value: fmtDate(lease.startDate), icon: Calendar, color: "text-blue-400" },
            { label: "Lease End", value: fmtDate(lease.endDate), icon: Calendar, color: daysLeft <= 30 ? "text-amber-400" : "text-gray-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-gray-800/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className={color} />
                <p className="text-gray-400 text-xs">{label}</p>
              </div>
              <p className="text-white text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Expiry warning */}
      {daysLeft > 0 && daysLeft <= 60 && (
        <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
          <Clock size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-medium text-sm">Lease expiring soon</p>
            <p className="text-amber-400/80 text-xs mt-0.5">Your lease expires in {daysLeft} days. Contact your property manager to discuss renewal.</p>
          </div>
        </div>
      )}

      {/* Contract status */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><PenLine size={14} className="text-purple-400" /> Contract Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Digital signature</span>
            {lease.contractSignedAt ? (
              <span className="flex items-center gap-1.5 text-green-400 text-xs"><CheckCircle size={12} /> Signed {fmtDate(lease.contractSignedAt)}</span>
            ) : (
              <span className="text-amber-400 text-xs">Pending signature</span>
            )}
          </div>
          {lease.signatureToken && !lease.contractSignedAt && (
            <Link href={`/sign-lease/${lease.signatureToken}`}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
              <PenLine size={14} /> Sign Lease Agreement
            </Link>
          )}
        </div>
      </div>

      {/* Terms preview */}
      {lease.contractTerms && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><FileText size={14} className="text-gray-400" /> Terms & Conditions</h3>
          <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line line-clamp-6">{lease.contractTerms}</p>
        </div>
      )}
    </div>
  )
}
