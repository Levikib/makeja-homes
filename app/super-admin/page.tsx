"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  TrendingUp,
  Clock,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  email: string;
  slug?: string | null;
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  billedAmount?: number | null;
  unitCount?: number | null;
  userCount?: number | null;
  adminEmail?: string;
  createdAt: string;
  isActive: boolean;
}

// ─── Badge helpers ─────────────────────────────────────────────────────────

function statusBadge(status: string | null | undefined) {
  const map: Record<string, string> = {
    TRIAL: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    ACTIVE: "bg-green-500/20 text-green-300 border-green-500/30",
    SUSPENDED: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    EXPIRED: "bg-red-500/20 text-red-300 border-red-500/30",
    CANCELLED: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  };
  const label = status ?? "UNKNOWN";
  const cls = map[label] ?? "bg-gray-500/20 text-gray-400 border-gray-600/30";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function tierBadge(tier: string | null | undefined) {
  const map: Record<string, string> = {
    STARTER: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    GROWTH: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    PRO: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    ENTERPRISE: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  };
  const label = tier ?? "FREE";
  const cls = map[label] ?? "bg-gray-500/20 text-gray-400 border-gray-600/30";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const CHART_COLORS: Record<string, string> = {
  TRIAL: "#3b82f6",
  ACTIVE: "#22c55e",
  SUSPENDED: "#eab308",
  EXPIRED: "#ef4444",
  CANCELLED: "#6b7280",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/companies", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      setCompanies(data.companies ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Computed stats ──────────────────────────────────────────────────────────

  const totalClients = companies.length;
  const activeCount = companies.filter((c) => c.subscriptionStatus === "ACTIVE").length;
  const trialCount = companies.filter((c) => c.subscriptionStatus === "TRIAL").length;
  const mrr = companies
    .filter((c) => c.subscriptionStatus === "ACTIVE")
    .reduce((sum, c) => sum + (c.billedAmount ?? 0), 0);

  const expiredCount = companies.filter((c) =>
    c.subscriptionStatus === "EXPIRED" || c.subscriptionStatus === "SUSPENDED"
  ).length;

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringTrials = companies.filter((c) => {
    if (c.subscriptionStatus !== "TRIAL" || !c.trialEndsAt) return false;
    const end = new Date(c.trialEndsAt);
    return end > now && end <= in7Days;
  });
  const expiringActive = companies.filter((c) => {
    if (c.subscriptionStatus !== "ACTIVE" || !c.subscriptionEndsAt) return false;
    const end = new Date(c.subscriptionEndsAt);
    return end > now && end <= in7Days;
  });

  const recentClients = [...companies]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // Subscription breakdown for chart
  const statusGroups: Record<string, number> = {};
  companies.forEach((c) => {
    const key = c.subscriptionStatus ?? "UNKNOWN";
    statusGroups[key] = (statusGroups[key] ?? 0) + 1;
  });
  const chartData = Object.entries(statusGroups).map(([name, value]) => ({
    name,
    value,
  }));

  // Tier breakdown
  const tierGroups: Record<string, number> = {};
  companies.forEach((c) => {
    const key = c.subscriptionTier ?? "STARTER";
    tierGroups[key] = (tierGroups[key] ?? 0) + 1;
  });
  const tierChartData = Object.entries(tierGroups).map(([name, value]) => ({
    name,
    value,
  }));

  const TIER_COLORS: Record<string, string> = {
    STARTER: "#6b7280",
    GROWTH: "#a855f7",
    PRO: "#f59e0b",
    ENTERPRISE: "#3b82f6",
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading platform data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-semibold mb-1">Failed to load data</p>
          <p className="text-red-400/70 text-sm mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Platform Overview
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            All SaaS clients at a glance
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 text-sm transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-violet-900/20 to-indigo-900/20 border border-violet-700/30 rounded-xl p-5 hover:border-violet-500/50 transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              Total Clients
            </p>
            <Building2 className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-4xl font-bold text-white">{totalClients}</p>
          <p className="text-gray-500 text-xs mt-1">All registered companies</p>
        </div>

        <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-xl p-5 hover:border-green-500/50 transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              Active Subscriptions
            </p>
            <Users className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-4xl font-bold text-white">{activeCount}</p>
          <p className="text-gray-500 text-xs mt-1">Status = ACTIVE</p>
        </div>

        <div className="bg-gradient-to-br from-blue-900/20 to-sky-900/20 border border-blue-700/30 rounded-xl p-5 hover:border-blue-500/50 transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              On Trial
            </p>
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-4xl font-bold text-white">{trialCount}</p>
          <p className="text-gray-500 text-xs mt-1">Status = TRIAL</p>
        </div>

        <div className="bg-gradient-to-br from-amber-900/20 to-yellow-900/20 border border-amber-700/30 rounded-xl p-5 hover:border-amber-500/50 transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              MRR
            </p>
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-white">
            KSH {mrr.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs mt-1">Active subscriptions only</p>
        </div>
      </div>

      {/* Alerts strip */}
      {(expiredCount > 0 || expiringTrials.length > 0 || expiringActive.length > 0) && (
        <div className="space-y-2">
          {expiredCount > 0 && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm font-medium">
                {expiredCount} account{expiredCount > 1 ? "s are" : " is"} expired or suspended —{" "}
                <Link href="/super-admin/clients?status=EXPIRED" className="underline hover:text-red-200 transition">review</Link>
              </p>
            </div>
          )}
          {expiringTrials.length > 0 && (
            <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-5 py-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <p className="text-yellow-300 text-sm font-medium">
                {expiringTrials.length} trial{expiringTrials.length > 1 ? "s expire" : " expires"} within 7 days:{" "}
                {expiringTrials.slice(0, 3).map((c, i) => (
                  <span key={c.id}>
                    <Link href={`/super-admin/clients/${c.id}`} className="underline hover:text-yellow-200 transition">{c.name}</Link>
                    {i < Math.min(expiringTrials.length, 3) - 1 ? ", " : ""}
                  </span>
                ))}
                {expiringTrials.length > 3 && ` +${expiringTrials.length - 3} more`}
              </p>
            </div>
          )}
          {expiringActive.length > 0 && (
            <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-5 py-3">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <p className="text-orange-300 text-sm font-medium">
                {expiringActive.length} paid subscription{expiringActive.length > 1 ? "s expire" : " expires"} within 7 days —{" "}
                {expiringActive.slice(0, 3).map((c, i) => (
                  <span key={c.id}>
                    <Link href={`/super-admin/clients/${c.id}`} className="underline hover:text-orange-200 transition">{c.name}</Link>
                    {i < Math.min(expiringActive.length, 3) - 1 ? ", " : ""}
                  </span>
                ))}
                {expiringActive.length > 3 && ` +${expiringActive.length - 3} more`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription status breakdown */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Subscription Status
          </h2>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={CHART_COLORS[entry.name] ?? "#6b7280"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "0.5rem",
                    color: "#f9fafb",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-gray-300 text-xs">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tier breakdown */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Plan Tier Breakdown
          </h2>
          {tierChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={tierChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {tierChartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={TIER_COLORS[entry.name] ?? "#6b7280"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "0.5rem",
                    color: "#f9fafb",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-gray-300 text-xs">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Clients */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Recent Clients</h2>
          <Link
            href="/super-admin/clients"
            className="text-violet-400 hover:text-violet-300 text-sm flex items-center gap-1 transition"
          >
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-6 py-3">Company</th>
                <th className="text-left px-6 py-3">Subdomain</th>
                <th className="text-left px-6 py-3">Plan</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Expires</th>
                <th className="text-left px-6 py-3">Joined</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {recentClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-500">
                    No clients yet
                  </td>
                </tr>
              )}
              {recentClients.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{c.name}</p>
                      <p className="text-gray-500 text-xs">{c.adminEmail}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                    {c.slug ? `${c.slug}.makejahomes.co.ke` : "—"}
                  </td>
                  <td className="px-6 py-4">{tierBadge(c.subscriptionTier)}</td>
                  <td className="px-6 py-4">{statusBadge(c.subscriptionStatus)}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {c.subscriptionStatus === "TRIAL"
                      ? fmtDate(c.trialEndsAt)
                      : fmtDate(c.subscriptionEndsAt)}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {fmtDate(c.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/super-admin/clients/${c.id}`}
                      className="text-violet-400 hover:text-violet-300 text-xs font-medium transition"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
