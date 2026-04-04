"use client"

import { useState, useCallback } from "react"
import {
  Brain, TrendingUp, AlertTriangle, Lightbulb, Activity,
  RefreshCw, DollarSign, Wrench, ChevronRight,
} from "lucide-react"

type InsightCategory = "FINANCIAL" | "OPERATIONAL" | "RISK" | "OPPORTUNITY"
type Priority = "HIGH" | "MEDIUM" | "LOW"

interface Insight {
  category: InsightCategory
  title: string
  insight: string
  action: string
  priority: Priority
  metric: string
}

const CATEGORY_CONFIG: Record<InsightCategory, { icon: any; color: string; bg: string; border: string }> = {
  FINANCIAL: { icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  OPERATIONAL: { icon: Wrench, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  RISK: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  OPPORTUNITY: { icon: Lightbulb, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  HIGH: { label: "High Priority", color: "text-red-400 bg-red-900/30 border-red-500/30" },
  MEDIUM: { label: "Medium", color: "text-amber-400 bg-amber-900/30 border-amber-500/30" },
  LOW: { label: "Low", color: "text-gray-400 bg-gray-800 border-gray-700" },
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState<"ai" | "rule-based" | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/insights", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to generate insights")
      setInsights(data.insights ?? [])
      setSource(data.source)
      setGeneratedAt(data.generatedAt)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const highPriority = insights.filter((i) => i.priority === "HIGH")
  const otherInsights = insights.filter((i) => i.priority !== "HIGH")

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold">Business Insights</h1>
          </div>
          <p className="text-gray-400 text-sm ml-13">
            AI-powered analysis of your property portfolio in real time
          </p>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 whitespace-nowrap"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          {loading ? "Analysing..." : insights.length ? "Refresh Analysis" : "Generate Insights"}
        </button>
      </div>

      {/* Empty state */}
      {!loading && insights.length === 0 && !error && (
        <div className="border border-dashed border-gray-700 rounded-2xl p-16 text-center">
          <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <Brain size={36} className="text-purple-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Ready to Analyse Your Business</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
            Click "Generate Insights" to get a personalised AI analysis of your revenue, occupancy, maintenance patterns, and operational efficiency.
          </p>
          <button
            onClick={fetchInsights}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition"
          >
            Generate Insights
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-700 rounded-xl" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-700 rounded w-48" />
                <div className="h-3 bg-gray-700 rounded w-24" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-700 rounded w-full" />
              <div className="h-3 bg-gray-700 rounded w-4/5" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-40" />
            ))}
          </div>
          <p className="text-center text-gray-500 text-sm mt-2 animate-pulse">
            Analysing your business data...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Insights */}
      {!loading && insights.length > 0 && (
        <>
          {/* Meta bar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">{insights.length} insights generated</span>
              {source && (
                <span className={`text-xs px-2.5 py-1 rounded-full border ${source === "ai" ? "bg-purple-900/30 text-purple-300 border-purple-500/30" : "bg-gray-800 text-gray-400 border-gray-700"}`}>
                  {source === "ai" ? "AI Analysis" : "Rule-based"}
                </span>
              )}
            </div>
            {generatedAt && (
              <span className="text-gray-500 text-xs">
                {new Date(generatedAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          {/* High priority banner */}
          {highPriority.length > 0 && (
            <div className="space-y-3 mb-6">
              <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle size={14} /> Requires Immediate Attention
              </h2>
              {highPriority.map((insight, i) => (
                <InsightCard key={i} insight={insight} expanded />
              ))}
            </div>
          )}

          {/* Other insights grid */}
          {otherInsights.length > 0 && (
            <>
              {highPriority.length > 0 && (
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Additional Insights
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {otherInsights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function InsightCard({ insight, expanded = false }: { insight: Insight; expanded?: boolean }) {
  const [open, setOpen] = useState(expanded)
  const cfg = CATEGORY_CONFIG[insight.category] ?? CATEGORY_CONFIG.OPERATIONAL
  const pCfg = PRIORITY_CONFIG[insight.priority]
  const Icon = cfg.icon

  return (
    <div className={`${cfg.bg} ${cfg.border} border rounded-2xl overflow-hidden transition-all`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
              <Icon size={16} className={cfg.color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${pCfg.color}`}>
                  {pCfg.label}
                </span>
                <span className="text-xs text-gray-500">{insight.category}</span>
              </div>
              <h3 className="text-white font-semibold text-sm leading-tight">{insight.title}</h3>
              <p className={`text-xs font-mono mt-1 ${cfg.color}`}>{insight.metric}</p>
            </div>
          </div>
          <ChevronRight
            size={16}
            className={`text-gray-500 flex-shrink-0 mt-1 transition-transform ${open ? "rotate-90" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
          <p className="text-gray-300 text-sm leading-relaxed">{insight.insight}</p>
          <div className="bg-black/20 rounded-xl p-3 border border-white/5">
            <p className="text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1.5">
              <Activity size={11} /> Recommended Action
            </p>
            <p className="text-sm text-white">{insight.action}</p>
          </div>
        </div>
      )}
    </div>
  )
}
