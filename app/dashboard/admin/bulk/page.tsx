"use client"

import { useState } from "react"
import {
  FileText, Download, CheckCircle, AlertTriangle,
  RefreshCw, Calendar, DollarSign, Zap,
} from "lucide-react"

type Result = { success: boolean; message: string }

export default function BulkOperationsPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [billMonth, setBillMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })

  const run = async (action: string, extra?: object) => {
    setLoading(action)
    setResult(null)
    try {
      const [year, month] = billMonth.split("-").map(Number)
      const body: any = { action, ...extra }
      if (action === "generate-bills") { body.month = month; body.year = year }

      const res = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Request failed")

      let message = "Operation completed"
      if (data.created !== undefined) message = `Created ${data.created} bills (${data.skipped} skipped)`
      if (data.updated !== undefined) message = `Updated ${data.updated} records`
      setResult({ success: true, message })
    } catch (err: any) {
      setResult({ success: false, message: err.message })
    } finally {
      setLoading(null)
    }
  }

  const download = async (action: string, label: string) => {
    setLoading(action)
    try {
      const res = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${label}-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setResult({ success: false, message: err.message })
    } finally {
      setLoading(null)
    }
  }

  const sections = [
    {
      title: "Bills Management",
      icon: FileText,
      color: "border-purple-500/20",
      actions: [
        {
          id: "generate-bills",
          label: "Generate Monthly Bills",
          desc: "Auto-generate bills for all tenants with active leases for the selected month.",
          extra: (
            <div className="flex items-center gap-2 mt-2">
              <label className="text-gray-400 text-sm">Month:</label>
              <input
                type="month" value={billMonth}
                onChange={(e) => setBillMonth(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white text-sm px-3 py-1.5 rounded-lg"
              />
            </div>
          ),
          buttonLabel: "Generate Bills",
          buttonColor: "bg-purple-600 hover:bg-purple-700",
          icon: Calendar,
          danger: false,
        },
        {
          id: "mark-bills-overdue",
          label: "Mark Overdue Bills",
          desc: "Scan all PENDING and UNPAID bills whose due date has passed and mark them OVERDUE.",
          buttonLabel: "Run Overdue Check",
          buttonColor: "bg-amber-600 hover:bg-amber-700",
          icon: AlertTriangle,
          danger: false,
        },
      ],
    },
    {
      title: "Exports",
      icon: Download,
      color: "border-blue-500/20",
      actions: [
        {
          id: "export-payments-csv",
          label: "Export All Payments (CSV)",
          desc: "Download a CSV file of all payment records for accounting or reporting.",
          buttonLabel: "Download CSV",
          buttonColor: "bg-blue-600 hover:bg-blue-700",
          icon: Download,
          isDownload: true,
          downloadLabel: "payments",
        },
        {
          id: "export-arrears-csv",
          label: "Export Arrears Report (CSV)",
          desc: "Download all overdue and unpaid bills as a CSV file.",
          buttonLabel: "Download CSV",
          buttonColor: "bg-blue-600 hover:bg-blue-700",
          icon: Download,
          isDownload: true,
          downloadLabel: "arrears",
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Bulk Operations</h1>
        <p className="text-gray-400 text-sm mt-1">Run batch operations across all tenants and bills</p>
      </div>

      {result && (
        <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 border ${
          result.success
            ? "bg-green-900/20 border-green-500/30 text-green-300"
            : "bg-red-900/20 border-red-500/30 text-red-300"
        }`}>
          {result.success ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span className="text-sm">{result.message}</span>
          <button onClick={() => setResult(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">Dismiss</button>
        </div>
      )}

      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className={`bg-gray-900 border ${section.color} rounded-xl p-6`}>
            <div className="flex items-center gap-2 mb-5">
              <section.icon size={18} className="text-gray-400" />
              <h2 className="text-base font-semibold">{section.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.actions.map((action: any) => (
                <div key={action.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-gray-700/50 rounded-lg mt-0.5">
                      <action.icon size={16} className="text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{action.label}</h3>
                      <p className="text-gray-400 text-xs mt-1 leading-relaxed">{action.desc}</p>
                    </div>
                  </div>
                  {action.extra}
                  <button
                    onClick={() =>
                      action.isDownload
                        ? download(action.id, action.downloadLabel)
                        : run(action.id)
                    }
                    disabled={loading === action.id}
                    className={`mt-4 w-full flex items-center justify-center gap-2 ${action.buttonColor} disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-medium transition-colors`}
                  >
                    {loading === action.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <action.icon size={14} />
                    )}
                    {loading === action.id ? "Running..." : action.buttonLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
