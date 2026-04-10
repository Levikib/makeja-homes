"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  DollarSign, Wrench, User, Home, FileText, ArrowRightLeft, Package,
  LogIn, LogOut, Key, Trash2, AlertTriangle, CheckCircle, XCircle,
  Clock, Download, ChevronDown, ChevronUp, Activity, Eye
} from "lucide-react";

const ACTION_META: Record<string, { icon: any; color: string; label: string; category: string }> = {
  // Payments
  PAYMENT_COMPLETED:   { icon: DollarSign,      color: "text-green-400 bg-green-500/10",   label: "Payment Completed",    category: "Finance" },
  PAYMENT_APPROVED:    { icon: CheckCircle,      color: "text-green-400 bg-green-500/10",   label: "Payment Approved",     category: "Finance" },
  PAYMENT_DECLINED:    { icon: XCircle,          color: "text-red-400 bg-red-500/10",       label: "Payment Declined",     category: "Finance" },
  PAYMENT_VERIFIED:    { icon: CheckCircle,      color: "text-green-400 bg-green-500/10",   label: "Payment Verified",     category: "Finance" },
  // Maintenance
  APPROVE:             { icon: CheckCircle,      color: "text-blue-400 bg-blue-500/10",     label: "Request Approved",     category: "Maintenance" },
  ASSIGN:              { icon: User,             color: "text-purple-400 bg-purple-500/10", label: "Request Assigned",     category: "Maintenance" },
  START:               { icon: Wrench,           color: "text-yellow-400 bg-yellow-500/10", label: "Work Started",         category: "Maintenance" },
  COMPLETE:            { icon: CheckCircle,      color: "text-green-400 bg-green-500/10",   label: "Work Completed",       category: "Maintenance" },
  REJECT:              { icon: XCircle,          color: "text-red-400 bg-red-500/10",       label: "Request Rejected",     category: "Maintenance" },
  // Auth
  LOGIN:               { icon: LogIn,            color: "text-cyan-400 bg-cyan-500/10",     label: "Login",                category: "Auth" },
  LOGOUT:              { icon: LogOut,           color: "text-gray-400 bg-gray-500/10",     label: "Logout",               category: "Auth" },
  PASSWORD_RESET:      { icon: Key,              color: "text-orange-400 bg-orange-500/10", label: "Password Reset",       category: "Auth" },
  // Tenants / Units
  TENANT_CREATED:      { icon: User,             color: "text-purple-400 bg-purple-500/10", label: "Tenant Created",       category: "Tenant" },
  UNIT_TRANSFER:       { icon: ArrowRightLeft,   color: "text-blue-400 bg-blue-500/10",     label: "Unit Transfer",        category: "Tenant" },
  LEASE_SIGNED:        { icon: FileText,         color: "text-green-400 bg-green-500/10",   label: "Lease Signed",         category: "Tenant" },
  // Properties
  CREATE:              { icon: Home,             color: "text-purple-400 bg-purple-500/10", label: "Created",              category: "System" },
  UPDATE:              { icon: FileText,         color: "text-blue-400 bg-blue-500/10",     label: "Updated",              category: "System" },
  DELETE:              { icon: Trash2,           color: "text-red-400 bg-red-500/10",       label: "Deleted",              category: "System" },
  // Bills
  BILL_CREATED:        { icon: FileText,         color: "text-blue-400 bg-blue-500/10",     label: "Bill Created",         category: "Finance" },
  BILLS_GENERATED:     { icon: FileText,         color: "text-blue-400 bg-blue-500/10",     label: "Bills Generated",      category: "Finance" },
  BILL_MARKED_PAID:    { icon: CheckCircle,      color: "text-green-400 bg-green-500/10",   label: "Bill Marked Paid",     category: "Finance" },
  // Payments
  PAYMENT_SUBMITTED:   { icon: DollarSign,       color: "text-yellow-400 bg-yellow-500/10", label: "Payment Submitted",    category: "Finance" },
  // Water
  WATER_READING_RECORDED: { icon: Activity,      color: "text-cyan-400 bg-cyan-500/10",     label: "Water Reading",        category: "Utilities" },
  WATER_READING_UPDATED:  { icon: Activity,      color: "text-cyan-400 bg-cyan-500/10",     label: "Water Reading Updated",category: "Utilities" },
  // Leases
  LEASE_CONTRACT_SENT: { icon: FileText,         color: "text-purple-400 bg-purple-500/10", label: "Contract Sent",        category: "Tenant" },
  LEASE_RENEWED:       { icon: FileText,         color: "text-green-400 bg-green-500/10",   label: "Lease Renewed",        category: "Tenant" },
  LEASE_TERMINATED:    { icon: XCircle,          color: "text-red-400 bg-red-500/10",       label: "Lease Terminated",     category: "Tenant" },
  // Users / Units
  USER_CREATED:        { icon: User,             color: "text-purple-400 bg-purple-500/10", label: "User Created",         category: "System" },
  UNIT_STATUS_CHANGED: { icon: Home,             color: "text-blue-400 bg-blue-500/10",     label: "Unit Status Changed",  category: "System" },
  // Inventory
  INVENTORY_ADJUST:    { icon: Package,          color: "text-orange-400 bg-orange-500/10", label: "Inventory Adjusted",   category: "Inventory" },
  PURCHASE_ORDER:      { icon: Package,          color: "text-blue-400 bg-blue-500/10",     label: "Purchase Order",       category: "Inventory" },
};

const CATEGORY_COLORS: Record<string, string> = {
  Finance:     "bg-green-500/10 text-green-400 border-green-500/30",
  Maintenance: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  Auth:        "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  Tenant:      "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Inventory:   "bg-orange-500/10 text-orange-400 border-orange-500/30",
  Utilities:   "bg-teal-500/10 text-teal-400 border-teal-500/30",
  System:      "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN:       "bg-red-500/10 text-red-400",
  MANAGER:     "bg-orange-500/10 text-orange-400",
  CARETAKER:   "bg-blue-500/10 text-blue-400",
  STOREKEEPER: "bg-yellow-500/10 text-yellow-400",
  TENANT:      "bg-purple-500/10 text-purple-400",
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { icon: Activity, color: "text-gray-400 bg-gray-500/10", label: action.replace(/_/g, " "), category: "System" };
}

function fmtTime(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getEntityLabel(entityType: string | null, entityId: string | null) {
  if (!entityType) return null;
  const shortId = entityId ? entityId.slice(-8) : "";
  return `${entityType} #${shortId}`;
}

function parseDetails(details: any): string {
  if (!details) return "";
  if (typeof details === "string") {
    try { details = JSON.parse(details); } catch { return details; }
  }
  if (details.message) return details.message;
  const entries = Object.entries(details)
    .filter(([k]) => !["id", "updatedAt", "createdAt"].includes(k))
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${v}`);
  return entries.join(" · ");
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [actionBreakdown, setActionBreakdown] = useState<Record<string, number>>({});

  // Filters
  const [search, setSearch]     = useState("");
  const [action, setAction]     = useState("");
  const [entity, setEntity]     = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Detail expand
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Live indicator
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = useCallback(async (page = 1, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search)   params.set("search", search);
    if (action)   params.set("action", action);
    if (entity)   params.set("entity", entity);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo)   params.set("to", dateTo);

    try {
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(data.pagination);
      setActionBreakdown(data.actionBreakdown || {});
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Audit log fetch failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, action, entity, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    pollRef.current = setInterval(() => fetchLogs(pagination.page, true), 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchLogs, pagination.page]);

  const clearFilters = () => {
    setSearch(""); setAction(""); setEntity(""); setDateFrom(""); setDateTo("");
  };
  const hasFilters = search || action || entity || dateFrom || dateTo;

  const topActions = Object.entries(actionBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const exportCsv = () => {
    const header = "Time,User,Role,Action,Entity,Details";
    const rows = logs.map(l => [
      new Date(l.createdAt).toISOString(),
      l.user?.name ?? "System",
      l.user?.role ?? "",
      l.action,
      l.entityType ?? "",
      parseDetails(l.details).replace(/,/g, ";"),
    ].map(v => `"${v}"`).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `audit-log-${Date.now()}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Log</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Complete system activity trail · {pagination.total.toLocaleString()} events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className={`w-1.5 h-1.5 rounded-full ${refreshing ? "bg-yellow-400 animate-pulse" : "bg-green-400"}`} />
            {refreshing ? "Syncing..." : `Updated ${fmtTime(lastRefresh.toISOString())}`}
          </div>
          <button onClick={() => fetchLogs(pagination.page, true)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700 rounded-lg text-xs transition">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Top action breakdown chips */}
      {topActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topActions.map(([act, cnt]) => {
            const meta = getActionMeta(act);
            const Icon = meta.icon;
            return (
              <button
                key={act}
                onClick={() => setAction(action === act ? "" : act)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition
                  ${action === act
                    ? "bg-purple-600 border-purple-500 text-white"
                    : "bg-gray-800/60 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
                  }`}
              >
                <Icon className="w-3 h-3" />
                {meta.label}
                <span className="ml-0.5 opacity-60">{cnt}</span>
              </button>
            );
          })}
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-500/30 bg-red-500/5 text-red-400 text-xs hover:bg-red-500/10 transition">
              <XCircle className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by user, action, entity, details…"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900/60 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm transition
              ${showFilters || (action || entity || dateFrom || dateTo)
                ? "border-purple-500/50 bg-purple-500/10 text-purple-400"
                : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
              }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(action || entity || dateFrom || dateTo) && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 ml-0.5" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-gray-900/40 border border-gray-700/50 rounded-xl">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Action</label>
              <input
                value={action}
                onChange={e => setAction(e.target.value)}
                placeholder="e.g. PAYMENT_APPROVED"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Entity Type</label>
              <select
                value={entity}
                onChange={e => setEntity(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="">All</option>
                <option value="payment">Payment</option>
                <option value="MaintenanceRequest">Maintenance</option>
                <option value="inventory">Inventory</option>
                <option value="tenant">Tenant</option>
                <option value="lease">Lease</option>
                <option value="unit">Unit</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500" />
            </div>
          </div>
        )}
      </div>

      {/* Log table */}
      <div className="bg-gray-900/40 border border-gray-700/60 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
            <p className="text-gray-500 text-sm">Loading activity logs…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Shield className="w-10 h-10 text-gray-700" />
            <p className="text-gray-400 font-medium">No logs found</p>
            {hasFilters && <p className="text-gray-600 text-sm">Try adjusting your filters</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-700/40">
            {logs.map(log => {
              const meta = getActionMeta(log.action);
              const Icon = meta.icon;
              const category = meta.category;
              const isExpanded = expandedId === log.id;
              const detailStr = parseDetails(log.details);

              return (
                <div key={log.id} className="group">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-800/40 transition text-left"
                  >
                    {/* Icon */}
                    <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${meta.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">{meta.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[category] ?? CATEGORY_COLORS.System}`}>
                          {category}
                        </span>
                        {log.entityType && (
                          <span className="text-xs text-gray-500 font-mono truncate max-w-[160px]">
                            {getEntityLabel(log.entityType, log.entityId)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {log.user ? (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <User className="w-3 h-3" />
                            {log.user.name}
                            {log.user.role && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLORS[log.user.role] ?? "bg-gray-500/10 text-gray-400"}`}>
                                {log.user.role}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">System</span>
                        )}
                        {detailStr && (
                          <span className="text-xs text-gray-600 truncate max-w-[300px]">· {detailStr}</span>
                        )}
                      </div>
                    </div>

                    {/* Time + expand */}
                    <div className="shrink-0 flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 whitespace-nowrap">{fmtTime(log.createdAt)}</p>
                        <p className="text-xs text-gray-700 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <Eye className={`w-3.5 h-3.5 transition ${isExpanded ? "text-purple-400" : "text-gray-700 group-hover:text-gray-500"}`} />
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-3 pt-0 ml-10 border-t border-gray-700/30 bg-gray-900/30">
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-gray-600 uppercase tracking-wider mb-1">Log ID</p>
                          <p className="text-gray-300 font-mono truncate">{log.id}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 uppercase tracking-wider mb-1">Entity</p>
                          <p className="text-gray-300">{log.entityType ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 uppercase tracking-wider mb-1">Entity ID</p>
                          <p className="text-gray-300 font-mono truncate">{log.entityId ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 uppercase tracking-wider mb-1">Timestamp</p>
                          <p className="text-gray-300">{new Date(log.createdAt).toLocaleString("en-KE")}</p>
                        </div>
                        {log.user && (
                          <>
                            <div>
                              <p className="text-gray-600 uppercase tracking-wider mb-1">User</p>
                              <p className="text-gray-300">{log.user.name}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 uppercase tracking-wider mb-1">Email</p>
                              <p className="text-gray-300 truncate">{log.user.email ?? "—"}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 uppercase tracking-wider mb-1">Role</p>
                              <p className={`inline-block px-2 py-0.5 rounded-full ${ROLE_COLORS[log.user.role] ?? "bg-gray-500/10 text-gray-400"}`}>
                                {log.user.role}
                              </p>
                            </div>
                          </>
                        )}
                        {log.details && (
                          <div className="col-span-2 md:col-span-4">
                            <p className="text-gray-600 uppercase tracking-wider mb-1">Details</p>
                            <pre className="text-gray-300 whitespace-pre-wrap font-mono text-xs bg-black/30 rounded-lg p-2 border border-gray-700/50">
                              {typeof log.details === "object"
                                ? JSON.stringify(log.details, null, 2)
                                : log.details}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} events
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded-lg hover:border-gray-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let p = i + 1;
                if (pagination.totalPages > 5) {
                  const start = Math.max(1, pagination.page - 2);
                  p = start + i;
                  if (p > pagination.totalPages) return null;
                }
                return (
                  <button
                    key={p}
                    onClick={() => fetchLogs(p)}
                    className={`w-8 h-7 text-xs rounded-lg transition ${p === pagination.page ? "bg-purple-600 text-white" : "border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded-lg hover:border-gray-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
