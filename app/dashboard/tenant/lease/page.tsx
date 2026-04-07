"use client"

import { useState, useEffect } from "react"
import { FileText, CheckCircle, Clock, Calendar, DollarSign, Home, PenLine, Download, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"

const fmt = (n: number) => `KES ${Math.round(n || 0).toLocaleString()}`
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "—"

export default function TenantLeasePage() {
  const [lease, setLease] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [termsOpen, setTermsOpen] = useState(false)

  useEffect(() => {
    fetch("/api/tenant/lease")
      .then(r => r.json())
      .then(d => { if (d && !d.error) setLease(d) })
      .finally(() => setLoading(false))
  }, [])

  const handleDownload = () => {
    if (!lease?.contractTerms) return
    const tenant = lease.tenant
    const content = [
      "LEASE AGREEMENT",
      "================",
      "",
      `Property: ${lease.property?.name}`,
      `Unit: ${lease.unit?.unitNumber}`,
      `Tenant: ${tenant?.name}`,
      `Email: ${tenant?.email}`,
      `Phone: ${tenant?.phone || "—"}`,
      "",
      `Lease Start: ${fmtDate(lease.startDate)}`,
      `Lease End: ${fmtDate(lease.endDate)}`,
      `Monthly Rent: ${fmt(lease.rentAmount)}`,
      `Security Deposit: ${fmt(lease.depositAmount)}`,
      "",
      lease.contractSignedAt ? `Digitally signed on: ${fmtDate(lease.contractSignedAt)}` : "STATUS: PENDING SIGNATURE",
      "",
      "TERMS & CONDITIONS",
      "------------------",
      lease.contractTerms,
    ].join("\n")

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `lease-agreement-unit-${lease.unit?.unitNumber || "unknown"}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!lease) return (
    <div className="text-center py-16">
      <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
      <p className="text-white font-medium">No active lease found</p>
      <p className="text-gray-400 text-sm mt-1">Contact your property manager if you believe this is an error.</p>
    </div>
  )

  const now = new Date()
  const end = new Date(lease.endDate)
  const start = new Date(lease.startDate)
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const progress = Math.min(100, Math.max(0, Math.round(((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100)))

  const statusColor: Record<string, string> = {
    Active: "bg-green-500/10 text-green-400 border-green-500/30",
    "Expiring Soon": "bg-amber-500/10 text-amber-400 border-amber-500/30",
    Upcoming: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    Expired: "bg-gray-800 text-gray-400 border-gray-700",
  }

  return (
    <div className="text-white space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" /> My Lease
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Lease agreement and property details</p>
        </div>
        {lease.contractTerms && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition"
          >
            <Download className="w-4 h-4" /> Download
          </button>
        )}
      </div>

      {/* Status + timeline */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Current Lease</p>
            <p className="text-white font-bold">{lease.property?.name} · Unit {lease.unit?.unitNumber}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${statusColor[lease.status] ?? statusColor.Active}`}>
            {lease.status}
          </span>
        </div>

        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{fmtDate(lease.startDate)}</span>
            <span className={daysLeft <= 30 ? "text-amber-400 font-medium" : "text-gray-500"}>
              {daysLeft > 0 ? `${daysLeft} days remaining` : "Expired"}
            </span>
            <span>{fmtDate(lease.endDate)}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${daysLeft <= 30 ? "bg-amber-500" : "bg-gradient-to-r from-purple-500 to-pink-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-500 text-xs mt-1 text-right">{progress}% of lease elapsed</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Monthly Rent", value: fmt(lease.rentAmount), icon: DollarSign, color: "text-green-400" },
            { label: "Security Deposit", value: fmt(lease.depositAmount), icon: DollarSign, color: "text-purple-400" },
            { label: "Lease Start", value: fmtDate(lease.startDate), icon: Calendar, color: "text-blue-400" },
            { label: "Lease End", value: fmtDate(lease.endDate), icon: Calendar, color: daysLeft <= 30 ? "text-amber-400" : "text-gray-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-gray-800/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3 h-3 ${color}`} />
                <p className="text-gray-400 text-xs">{label}</p>
              </div>
              <p className="text-white text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tenant & property info */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Home className="w-4 h-4 text-purple-400" /> Parties to this Agreement
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs mb-1">Tenant</p>
            <p className="text-white font-medium">{lease.tenant?.name}</p>
            <p className="text-gray-400 text-xs mt-0.5">{lease.tenant?.email}</p>
            {lease.tenant?.phone && <p className="text-gray-400 text-xs">{lease.tenant.phone}</p>}
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Property</p>
            <p className="text-white font-medium">{lease.property?.name}</p>
            <p className="text-gray-400 text-xs mt-0.5">{lease.property?.address}</p>
            {lease.property?.city && <p className="text-gray-400 text-xs">{lease.property.city}</p>}
          </div>
        </div>
      </div>

      {/* Expiry warning */}
      {daysLeft > 0 && daysLeft <= 60 && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-medium text-sm">Lease expiring in {daysLeft} days</p>
            <p className="text-amber-400/80 text-xs mt-0.5">Please contact your property manager to discuss renewal before your lease expires.</p>
          </div>
        </div>
      )}

      {/* Signature status */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <PenLine className="w-4 h-4 text-purple-400" /> Signature Status
        </h3>
        {lease.contractSignedAt ? (
          <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-green-400 font-medium text-sm">Digitally signed</p>
              <p className="text-gray-400 text-xs mt-0.5">Signed on {fmtDate(lease.contractSignedAt)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-amber-400 text-sm">Awaiting signature</p>
          </div>
        )}
      </div>

      {/* Full contract terms — expandable */}
      {lease.contractTerms && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setTermsOpen(!termsOpen)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition text-left"
          >
            <span className="text-sm font-semibold flex items-center gap-2 text-white">
              <FileText className="w-4 h-4 text-gray-400" /> Terms & Conditions
            </span>
            {termsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {termsOpen && (
            <div className="border-t border-gray-800 p-5">
              <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{lease.contractTerms}</pre>
              <button
                onClick={handleDownload}
                className="mt-4 flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm transition"
              >
                <Download className="w-4 h-4" /> Download as text file
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
