"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";
import {
  Building2, Users, FileText, TrendingUp, Home, AlertTriangle,
  Clock, DollarSign, CheckCircle, XCircle, Wrench, Activity,
  User, RefreshCw, ChevronRight, Calendar, Droplets, ShieldCheck,
} from "lucide-react";

const ACTION_META: Record<string, { icon: any; color: string; label: string }> = {
  LOGIN:                   { icon: User,        color: "text-blue-400 bg-blue-500/10",     label: "Login" },
  LOGOUT:                  { icon: User,        color: "text-gray-400 bg-gray-500/10",     label: "Logout" },
  PAYMENT_VERIFIED:        { icon: CheckCircle, color: "text-green-400 bg-green-500/10",   label: "Payment Verified" },
  PAYMENT_APPROVED:        { icon: CheckCircle, color: "text-green-400 bg-green-500/10",   label: "Payment Approved" },
  PAYMENT_DECLINED:        { icon: XCircle,     color: "text-red-400 bg-red-500/10",       label: "Payment Declined" },
  PAYMENT_SUBMITTED:       { icon: DollarSign,  color: "text-yellow-400 bg-yellow-500/10", label: "Payment Submitted" },
  BILL_CREATED:            { icon: FileText,    color: "text-blue-400 bg-blue-500/10",     label: "Bill Created" },
  BILLS_GENERATED:         { icon: FileText,    color: "text-blue-400 bg-blue-500/10",     label: "Bills Generated" },
  BILL_MARKED_PAID:        { icon: CheckCircle, color: "text-green-400 bg-green-500/10",   label: "Bill Marked Paid" },
  WATER_READING_RECORDED:  { icon: Droplets,    color: "text-cyan-400 bg-cyan-500/10",     label: "Water Reading" },
  WATER_READING_UPDATED:   { icon: Droplets,    color: "text-cyan-400 bg-cyan-500/10",     label: "Water Reading Updated" },
  LEASE_CONTRACT_SENT:     { icon: FileText,    color: "text-purple-400 bg-purple-500/10", label: "Contract Sent" },
  LEASE_SIGNED:            { icon: ShieldCheck, color: "text-green-400 bg-green-500/10",   label: "Lease Signed" },
  LEASE_RENEWED:           { icon: FileText,    color: "text-green-400 bg-green-500/10",   label: "Lease Renewed" },
  LEASE_TERMINATED:        { icon: XCircle,     color: "text-red-400 bg-red-500/10",       label: "Lease Terminated" },
  USER_CREATED:            { icon: User,        color: "text-purple-400 bg-purple-500/10", label: "User Created" },
  UNIT_STATUS_CHANGED:     { icon: Home,        color: "text-blue-400 bg-blue-500/10",     label: "Unit Status Changed" },
  MAINTENANCE_CREATED:     { icon: Wrench,      color: "text-amber-400 bg-amber-500/10",   label: "Maintenance Request" },
  MAINTENANCE_UPDATED:     { icon: Wrench,      color: "text-amber-400 bg-amber-500/10",   label: "Maintenance Updated" },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { icon: Activity, color: "text-gray-400 bg-gray-500/10", label: action };
}

function timeAgo(date: string | Date) {
  const now = Date.now();
  const d = new Date(date).getTime();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(false);
    intervalRef.current = setInterval(() => fetchStats(true), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchStats]);

  if (error && !stats) {
    return (
      <div className="text-white p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">Error loading dashboard: {error}</p>
          <button onClick={() => fetchStats(false)} className="mt-4 bg-red-500 px-4 py-2 rounded text-white">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-gray-800 rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-800 rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-800 rounded-xl" />
      </div>
    );
  }

  const revenueData = stats.revenueData ?? [];
  const recentActivity = stats.recentActivity ?? [];
  const billsThisMonth = stats.billsThisMonth ?? { total: 0, paid: 0, collected: 0, expected: 0 };
  const collectionPct = billsThisMonth.total > 0
    ? Math.round((billsThisMonth.paid / billsThisMonth.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <span className="text-4xl">🏢</span> {stats.companyName || "Dashboard"}
          </h1>
          <p className="text-gray-400 mt-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live overview · Last updated {lastRefresh ? timeAgo(lastRefresh) : "now"}
          </p>
        </div>
        <button
          onClick={() => fetchStats(false)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Primary Stats — row 1: property/unit/tenant/revenue */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          gradient="from-purple-900/20 to-pink-900/20"
          border="border-purple-700/30 hover:border-purple-500/60 hover:shadow-purple-500/30"
          glow="from-purple-600/5"
          label="Total Properties"
          icon="🏢"
          value={stats.totalProperties ?? 0}
          sub={stats.totalProperties === 0 ? "Add your first property" : "Active properties"}
        />
        <StatCard
          gradient="from-blue-900/20 to-cyan-900/20"
          border="border-blue-700/30 hover:border-cyan-500/60 hover:shadow-cyan-500/30"
          glow="from-cyan-600/5"
          label="Total Units"
          icon="🏠"
          value={stats.totalUnits ?? 0}
          sub={`${stats.occupiedUnits ?? 0} occ · ${stats.vacantUnits ?? 0} vacant · ${stats.reservedUnits ?? 0} reserved`}
        />
        <StatCard
          gradient="from-pink-900/20 to-rose-900/20"
          border="border-pink-700/30 hover:border-pink-500/60 hover:shadow-pink-500/30"
          glow="from-pink-600/5"
          label="Active Tenants"
          icon="👥"
          value={stats.totalTenants ?? 0}
          sub={stats.totalTenants === 0 ? "No tenants yet" : "Tenants with active units"}
        />
        <StatCard
          gradient="from-green-900/20 to-emerald-900/20"
          border="border-green-700/30 hover:border-green-500/60 hover:shadow-green-500/30"
          glow="from-green-600/5"
          label="This Month Revenue"
          icon="💰"
          value={`KSH ${(stats.thisMonthRevenue ?? 0).toLocaleString()}`}
          valueSm
          sub={`${stats.paymentsCount ?? 0} completed payment${stats.paymentsCount !== 1 ? "s" : ""}`}
        />
      </div>

      {/* Secondary Stats — row 2: alerts/metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Payments */}
        <Link href="/dashboard/admin/payments?filter=pending">
          <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
            (stats.pendingPayments ?? 0) > 0
              ? "bg-yellow-900/20 border-yellow-500/30 hover:border-yellow-400/50"
              : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
          }`}>
            <div className={`p-3 rounded-lg ${(stats.pendingPayments ?? 0) > 0 ? "bg-yellow-500/10" : "bg-gray-700/50"}`}>
              <Clock className={`w-5 h-5 ${(stats.pendingPayments ?? 0) > 0 ? "text-yellow-400" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Pending Verification</p>
              <p className={`text-2xl font-bold ${(stats.pendingPayments ?? 0) > 0 ? "text-yellow-400" : "text-white"}`}>
                {stats.pendingPayments ?? 0}
              </p>
              <p className="text-gray-500 text-xs">payments awaiting review</p>
            </div>
          </div>
        </Link>

        {/* Expiring Leases */}
        <Link href="/dashboard/admin/leases?filter=expiring">
          <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
            (stats.expiringLeases ?? 0) > 0
              ? "bg-orange-900/20 border-orange-500/30 hover:border-orange-400/50"
              : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
          }`}>
            <div className={`p-3 rounded-lg ${(stats.expiringLeases ?? 0) > 0 ? "bg-orange-500/10" : "bg-gray-700/50"}`}>
              <Calendar className={`w-5 h-5 ${(stats.expiringLeases ?? 0) > 0 ? "text-orange-400" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Expiring Leases</p>
              <p className={`text-2xl font-bold ${(stats.expiringLeases ?? 0) > 0 ? "text-orange-400" : "text-white"}`}>
                {stats.expiringLeases ?? 0}
              </p>
              <p className="text-gray-500 text-xs">within 30 days</p>
            </div>
          </div>
        </Link>

        {/* Open Maintenance */}
        <Link href="/dashboard/maintenance">
          <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
            (stats.openMaintenance ?? 0) > 0
              ? "bg-amber-900/20 border-amber-500/30 hover:border-amber-400/50"
              : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
          }`}>
            <div className={`p-3 rounded-lg ${(stats.openMaintenance ?? 0) > 0 ? "bg-amber-500/10" : "bg-gray-700/50"}`}>
              <Wrench className={`w-5 h-5 ${(stats.openMaintenance ?? 0) > 0 ? "text-amber-400" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Open Maintenance</p>
              <p className={`text-2xl font-bold ${(stats.openMaintenance ?? 0) > 0 ? "text-amber-400" : "text-white"}`}>
                {stats.openMaintenance ?? 0}
              </p>
              <p className="text-gray-500 text-xs">pending/in-progress</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Overdue bills alert strip */}
      {(stats.overdueCount ?? 0) > 0 && (
        <Link href="/dashboard/admin/payments?filter=overdue">
          <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/30 rounded-xl px-5 py-3 text-red-300 hover:bg-red-900/30 transition">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="font-medium">{stats.overdueCount} overdue bill{stats.overdueCount > 1 ? "s" : ""} require immediate attention</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </div>
        </Link>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all">
          <div className="mb-4">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Revenue Overview
            </h2>
            <p className="text-gray-400 text-sm">Last 6 months · completed payments vs expenses</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: "12px" }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "0.5rem" }}
                formatter={(val: any) => [`KSH ${Number(val).toLocaleString()}`, undefined]}
              />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ec4899" fillOpacity={1} fill="url(#colorExpenses)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500" /><span className="text-gray-400 text-sm">Revenue</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-pink-500" /><span className="text-gray-400 text-sm">Expenses</span></div>
          </div>
        </div>

        {/* Right column: Occupancy + Collection Rate */}
        <div className="flex flex-col gap-4">
          {/* Occupancy */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-all flex-1">
            <h3 className="text-base font-semibold text-white mb-3">Occupancy Rate</h3>
            <div className="flex items-center justify-center my-2">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle className="text-gray-700" strokeWidth="8" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                  <circle
                    className="text-cyan-500 transition-all duration-1000 ease-out"
                    strokeWidth="8"
                    strokeDasharray={`${((stats.occupancyRate ?? 0) / 100) * 264}, 264`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="42"
                    cx="50"
                    cy="50"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-600 bg-clip-text text-transparent">
                    {stats.occupancyRate ?? 0}%
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Occupied</span><span className="text-green-400 font-bold">{stats.occupiedUnits ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Vacant</span><span className="text-red-400 font-bold">{stats.vacantUnits ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Reserved</span><span className="text-yellow-400 font-bold">{stats.reservedUnits ?? 0}</span></div>
            </div>
          </div>

          {/* Bills Collection */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-all">
            <h3 className="text-base font-semibold text-white mb-3">Bills This Month</h3>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold text-white">{collectionPct}%</span>
              <span className="text-gray-400 text-sm">{billsThisMonth.paid}/{billsThisMonth.total} paid</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full transition-all duration-700"
                style={{ width: `${collectionPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Collected: KSH {Number(billsThisMonth.collected).toLocaleString()}</span>
              <span>Expected: KSH {Number(billsThisMonth.expected).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-600 bg-clip-text text-transparent mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/dashboard/properties/new">
            <div className="group relative bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4 overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Building2 className="w-6 h-6 text-white mb-2" />
              <p className="text-white font-semibold text-sm">Add Property</p>
            </div>
          </Link>
          <Link href="/dashboard/admin/tenants/new">
            <div className="group relative bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-lg p-4 overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Users className="w-6 h-6 text-white mb-2" />
              <p className="text-white font-semibold text-sm">Add Tenant</p>
            </div>
          </Link>
          <Link href="/dashboard/admin/leases/new">
            <div className="group relative bg-gradient-to-br from-pink-600 to-pink-700 rounded-lg p-4 overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:shadow-pink-500/50">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <FileText className="w-6 h-6 text-white mb-2" />
              <p className="text-white font-semibold text-sm">Create Lease</p>
            </div>
          </Link>
          <Link href="/dashboard/admin/payments">
            <div className="group relative bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-4 overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/50">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <TrendingUp className="w-6 h-6 text-white mb-2" />
              <p className="text-white font-semibold text-sm">View Payments</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-600 bg-clip-text text-transparent">
            Recent Activity
          </h2>
          <Link href="/dashboard/admin/audit" className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No activity recorded yet.</p>
            <p className="text-gray-500 text-xs mt-1">Actions will appear here as the system is used.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((entry: any) => {
              const meta = getActionMeta(entry.action);
              const Icon = meta.icon;
              return (
                <div key={entry.id} className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900/70 transition">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{meta.label}</p>
                    <p className="text-gray-400 text-xs truncate">
                      {entry.user ? `${entry.user.name}${entry.user.role ? ` · ${entry.user.role}` : ""}` : "System"}
                      {entry.details?.property ? ` · ${entry.details.property}` : ""}
                      {entry.details?.unit ? `, Unit ${entry.details.unit}` : ""}
                    </p>
                  </div>
                  <span className="text-gray-500 text-xs flex-shrink-0">{timeAgo(entry.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  gradient, border, glow, label, icon, value, sub, valueSm,
}: {
  gradient: string;
  border: string;
  glow: string;
  label: string;
  icon: string;
  value: string | number;
  sub: string;
  valueSm?: boolean;
}) {
  return (
    <div className={`group relative bg-gradient-to-br ${gradient} border ${border} rounded-xl p-5 overflow-hidden transition-all hover:shadow-lg cursor-pointer`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${glow} to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300`} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
      </div>
      <div className="relative flex items-center justify-between mb-2">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`font-bold text-white relative mb-1 ${valueSm ? "text-2xl" : "text-4xl"}`}>{value}</p>
      <p className="text-gray-400 text-xs">{sub}</p>
    </div>
  );
}
