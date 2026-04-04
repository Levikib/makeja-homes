"use client"

import { useState, useEffect, useCallback } from "react"
import { Calculator, FileText, AlertTriangle, TrendingUp, Download, RefreshCw } from "lucide-react"

const fmt = (n: number) => `KSh ${Math.round(n || 0).toLocaleString()}`
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`

export default function TaxCompliancePage() {
  const [activeTab, setActiveTab] = useState<"summary" | "mri" | "stamp">("summary")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: activeTab === "mri" ? "mri-monthly" : activeTab === "stamp" ? "stamp-duty" : "summary", year: String(year), month: String(month) })
      const res = await fetch(`/api/admin/tax?${params}`)
      setData(await res.json())
    } catch {}
    setLoading(false)
  }, [activeTab, year, month])

  useEffect(() => { fetchData() }, [fetchData])

  const tabs = [
    { key: "summary", label: "Annual Summary" },
    { key: "mri", label: "MRI Monthly" },
    { key: "stamp", label: "Stamp Duty" },
  ] as const

  return (
    <div className="text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator size={22} className="text-purple-400" /> Tax & Compliance</h1>
          <p className="text-gray-400 text-sm mt-1">Kenyan property tax obligations — MRI WHT, stamp duty, land rates</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg">
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {activeTab === "mri" && (
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString("en-KE", { month: "long" })}</option>
              ))}
            </select>
          )}
          <button onClick={fetchData} className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KRA notice */}
      <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 mb-6 flex gap-3">
        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-amber-300 font-medium">Informational Only</p>
          <p className="text-amber-400/80">These calculations are based on publicly available KRA guidelines. Always verify with a certified tax advisor or KRA before making payments.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && data && activeTab === "summary" && <SummaryTab data={data} />}
      {!loading && data && activeTab === "mri" && <MriTab data={data} year={year} month={month} />}
      {!loading && data && activeTab === "stamp" && <StampTab data={data} />}
    </div>
  )
}

function StatCard({ label, value, sub, color = "purple" }: { label: string; value: string; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    purple: "border-purple-500/20 from-purple-500/10",
    green: "border-green-500/20 from-green-500/10",
    red: "border-red-500/20 from-red-500/10",
    amber: "border-amber-500/20 from-amber-500/10",
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color] ?? colors.purple} to-transparent border rounded-xl p-5`}>
      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function SummaryTab({ data }: { data: any }) {
  const fmt = (n: number) => `KSh ${Math.round(n || 0).toLocaleString()}`
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Gross Rent Collected" value={fmt(data.grossRentCollected)} color="green" />
        <StatCard label="MRI WHT (Annual)" value={fmt(data.mriTax?.annualProjected)} sub="7.5% on qualifying leases" color="amber" />
        <StatCard label="Contractor WHT" value={fmt(data.contractorWht?.whtOwed)} sub="3% on contractor payments" color="amber" />
        <StatCard label="Total Tax Liability" value={fmt(data.totalTaxLiability)} color="red" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><TrendingUp size={15} className="text-purple-400" /> MRI Withholding Tax</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Monthly WHT</span><span className="text-white font-medium">{fmt(data.mriTax?.monthlyTotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Annual WHT (projected)</span><span className="text-white font-medium">{fmt(data.mriTax?.annualProjected)}</span></div>
            <div className="border-t border-gray-800 pt-3">
              <p className="text-gray-500 text-xs">Rate: 7.5% on gross monthly rent for leases where annual rent {">"} KSH 288,000</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Calculator size={15} className="text-purple-400" /> Contractor WHT (s.35)</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Total contractor payments</span><span className="text-white font-medium">{fmt(data.contractorWht?.totalContractorPayments)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">WHT deductible (3%)</span><span className="text-amber-400 font-medium">{fmt(data.contractorWht?.whtOwed)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Net payable to contractor</span><span className="text-green-400 font-medium">{fmt(data.contractorWht?.netPayable)}</span></div>
          </div>
        </div>
      </div>

      {data.mriTax?.propertySummaries?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800"><h3 className="text-white font-semibold">MRI Tax by Property</h3></div>
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 text-xs uppercase border-b border-gray-800">
              <th className="text-left px-5 py-3">Property</th>
              <th className="text-right px-5 py-3">Monthly Rent</th>
              <th className="text-right px-5 py-3">Taxable Units</th>
              <th className="text-right px-5 py-3">Monthly WHT</th>
              <th className="text-right px-5 py-3">Annual WHT</th>
            </tr></thead>
            <tbody>
              {data.mriTax.propertySummaries.map((p: any, i: number) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-5 py-3 text-white">{p.propertyName}</td>
                  <td className="px-5 py-3 text-right text-gray-300">{fmt(p.totalMonthlyRent)}</td>
                  <td className="px-5 py-3 text-right text-gray-300">{p.taxableUnits}/{p.taxableUnits + p.exemptUnits}</td>
                  <td className="px-5 py-3 text-right text-amber-400">{fmt(p.totalMonthlyTax)}</td>
                  <td className="px-5 py-3 text-right text-amber-400">{fmt(p.totalAnnualTax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MriTab({ data, year, month }: { data: any; year: number; month: number }) {
  const fmt = (n: number) => `KSh ${Math.round(n || 0).toLocaleString()}`
  const s = data.summary ?? {}
  const monthLabel = new Date(year, month - 1).toLocaleString("en-KE", { month: "long", year: "numeric" })
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Leases" value={String(s.totalLeases ?? 0)} />
        <StatCard label="Taxable Leases" value={String(s.taxableLeases ?? 0)} sub="Annual rent > KSH 288K" color="amber" />
        <StatCard label="Total Monthly Rent" value={fmt(s.totalMonthlyRent)} color="green" />
        <StatCard label={`MRI WHT — ${monthLabel}`} value={fmt(s.totalMriTax)} color="red" />
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 text-xs uppercase border-b border-gray-800">
            <th className="text-left px-4 py-3">Tenant</th>
            <th className="text-left px-4 py-3 hidden md:table-cell">Property/Unit</th>
            <th className="text-right px-4 py-3">Monthly Rent</th>
            <th className="text-right px-4 py-3">WHT Applicable</th>
            <th className="text-right px-4 py-3">WHT Amount</th>
          </tr></thead>
          <tbody>
            {(data.leases ?? []).map((l: any, i: number) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 text-white">{l.tenant}</td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{l.property} / {l.unit}</td>
                <td className="px-4 py-3 text-right text-gray-300">{fmt(l.monthlyRent)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${l.mriTaxApplicable ? "bg-amber-900/40 text-amber-300" : "bg-gray-800 text-gray-500"}`}>
                    {l.mriTaxApplicable ? "Yes" : "Exempt"}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-medium ${l.monthlyMriTax > 0 ? "text-amber-400" : "text-gray-600"}`}>{fmt(l.monthlyMriTax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StampTab({ data }: { data: any }) {
  const fmt = (n: number) => `KSh ${Math.round(n || 0).toLocaleString()}`
  const fmtDate = (d: any) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-gray-300 text-sm">Total Stamp Duty (all active leases): <span className="text-white font-bold text-lg ml-2">{fmt(data.totalStampDuty ?? 0)}</span></p>
        <p className="text-gray-500 text-xs mt-2">Rates: ≤1yr = 0.5%, 1–3yr = 1%, &gt;3yr = 2% of annual rent</p>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 text-xs uppercase border-b border-gray-800">
            <th className="text-left px-4 py-3">Tenant</th>
            <th className="text-left px-4 py-3 hidden sm:table-cell">Unit</th>
            <th className="text-right px-4 py-3 hidden md:table-cell">Duration</th>
            <th className="text-right px-4 py-3">Annual Rent</th>
            <th className="text-right px-4 py-3">Rate</th>
            <th className="text-right px-4 py-3">Stamp Duty</th>
          </tr></thead>
          <tbody>
            {(data.leases ?? []).map((l: any, i: number) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 text-white">{l.tenant}</td>
                <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{l.property} / {l.unit}</td>
                <td className="px-4 py-3 text-right text-gray-400 hidden md:table-cell">{l.durationMonths} mo</td>
                <td className="px-4 py-3 text-right text-gray-300">{fmt(l.annualRent)}</td>
                <td className="px-4 py-3 text-right text-gray-400">{(l.stampDutyRate * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right text-amber-400 font-medium">{fmt(l.stampDutyAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
