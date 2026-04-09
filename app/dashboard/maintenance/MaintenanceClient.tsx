"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Wrench, Clock, CheckCircle, AlertTriangle, Search, X,
  MapPin, User, Calendar, Eye, Zap, TrendingUp, Filter,
  ChevronRight, Circle, ArrowRight, RefreshCw,
} from "lucide-react";

interface MaintenanceRequest {
  id: string;
  requestNumber?: string;
  title: string;
  description: string;
  category: string | null;
  priority: string;
  status: string;
  estimatedCost: number | null;
  actualCost: number | null;
  createdAt: string | Date;
  completedAt?: string | Date | null;
  units: {
    unitNumber: string;
    properties: { id: string; name: string };
  };
  users_maintenance_requests_createdByIdTousers: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  users_maintenance_requests_assignedToIdTousers: {
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

interface Stats {
  openCount: number;
  inProgressCount: number;
  completedCount: number;
  totalCost: number;
}

interface Props {
  requests: MaintenanceRequest[];
  properties: { id: string; name: string }[];
  stats: Stats;
  onRefresh?: () => void;
}

const PRIORITY_CONFIG = {
  EMERGENCY: { label: "Emergency", color: "text-red-400", bg: "bg-red-500/10 border-red-500/40", dot: "bg-red-500", ring: "ring-red-500/30", order: 0 },
  HIGH:      { label: "High",      color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/40", dot: "bg-orange-500", ring: "ring-orange-500/30", order: 1 },
  MEDIUM:    { label: "Medium",    color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/40", dot: "bg-yellow-400", ring: "ring-yellow-500/30", order: 2 },
  LOW:       { label: "Low",       color: "text-green-400",  bg: "bg-green-500/10 border-green-500/40",   dot: "bg-green-400",  ring: "ring-green-500/30",  order: 3 },
} as const;

const STATUS_CONFIG = {
  OPEN:        { label: "Open",        color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30",   glow: "shadow-blue-500/10" },
  PENDING:     { label: "Pending",     color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", glow: "shadow-yellow-500/10" },
  IN_PROGRESS: { label: "In Progress", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30", glow: "shadow-purple-500/10" },
  COMPLETED:   { label: "Completed",   color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30",  glow: "shadow-green-500/10" },
  CLOSED:      { label: "Closed",      color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/30",   glow: "" },
} as const;

const CATEGORIES = ["PLUMBING", "ELECTRICAL", "HVAC", "APPLIANCE", "STRUCTURAL", "PAINTING", "CARPENTRY", "OTHER"];

function daysAgo(date: string | Date) {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

function urgencyScore(r: MaintenanceRequest) {
  const pri = PRIORITY_CONFIG[r.priority as keyof typeof PRIORITY_CONFIG]?.order ?? 3;
  const age = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 86400000);
  return pri * 10 - age;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, gradient, border, iconColor,
}: {
  label: string; value: string | number; sub: string;
  icon: any; gradient: string; border: string; iconColor: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${border} ${gradient} p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-3xl font-black text-white leading-none">{value}</p>
          <p className={`text-xs mt-1.5 ${iconColor}`}>{sub}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${gradient} border ${border}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// ── Request card ──────────────────────────────────────────────────────────────
function RequestCard({ req }: { req: MaintenanceRequest }) {
  const pri = PRIORITY_CONFIG[req.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.LOW;
  const sta = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.CLOSED;
  const isUrgent = req.priority === "EMERGENCY" || req.priority === "HIGH";
  const age = Math.floor((Date.now() - new Date(req.createdAt).getTime()) / 86400000);
  const isStale = age > 7 && req.status !== "COMPLETED" && req.status !== "CLOSED";

  return (
    <Link href={`/dashboard/maintenance/${req.id}`} className="block group">
      <div className={`relative bg-gray-900/60 border rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01] hover:shadow-xl ${isUrgent ? "border-orange-500/30 hover:border-orange-500/60" : "border-gray-800 hover:border-gray-600"} ${sta.glow && `shadow-lg ${sta.glow}`}`}>
        {/* Urgency pulse for emergencies */}
        {req.priority === "EMERGENCY" && (
          <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
        )}

        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${pri.dot} ${req.priority === "EMERGENCY" ? "animate-pulse" : ""}`} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white leading-snug truncate group-hover:text-orange-300 transition-colors">
              {req.title}
            </h3>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {req.units?.properties?.name} · Unit {req.units?.unitNumber}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">{req.description}</p>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${pri.bg} ${pri.color}`}>
            {pri.label}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sta.bg} ${sta.color}`}>
            {sta.label}
          </span>
          {req.category && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-gray-700 text-gray-400 bg-gray-800/50">
              {req.category}
            </span>
          )}
          {isStale && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-amber-500/30 text-amber-400 bg-amber-500/10">
              Overdue
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-800/80">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {daysAgo(req.createdAt)}
            </span>
            {req.users_maintenance_requests_assignedToIdTousers ? (
              <span className="flex items-center gap-1 text-purple-400">
                <User className="w-3 h-3" />
                {req.users_maintenance_requests_assignedToIdTousers.firstName}
              </span>
            ) : (
              <span className="text-gray-600">Unassigned</span>
            )}
          </div>
          {(req.estimatedCost || req.actualCost) && (
            <span className="text-xs font-semibold text-orange-400">
              KES {(req.actualCost ?? req.estimatedCost ?? 0).toLocaleString()}
            </span>
          )}
        </div>

        <ChevronRight className="absolute right-4 bottom-4 w-3.5 h-3.5 text-gray-700 group-hover:text-orange-400 transition-colors" />
      </div>
    </Link>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MaintenanceClient({ requests, properties, stats, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [propFilter, setPropFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [view, setView] = useState<"grid" | "swimlane">("swimlane");

  const emergencyCount = requests.filter(r => r.priority === "EMERGENCY" && r.status !== "COMPLETED" && r.status !== "CLOSED").length;

  const filtered = useMemo(() => {
    return requests
      .filter((r) => {
        if (search && !r.title.toLowerCase().includes(search.toLowerCase()) &&
          !r.description.toLowerCase().includes(search.toLowerCase()) &&
          !r.units?.unitNumber?.toLowerCase().includes(search.toLowerCase())) return false;
        if (propFilter !== "all" && r.units?.properties?.id !== propFilter) return false;
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
        if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => urgencyScore(a) - urgencyScore(b));
  }, [requests, search, propFilter, statusFilter, priorityFilter, categoryFilter]);

  const hasFilters = search || propFilter !== "all" || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all";

  const swimlanes = [
    { key: "OPEN",        label: "Open",        color: "blue",   items: filtered.filter(r => r.status === "OPEN" || r.status === "PENDING") },
    { key: "IN_PROGRESS", label: "In Progress",  color: "purple", items: filtered.filter(r => r.status === "IN_PROGRESS") },
    { key: "COMPLETED",   label: "Completed",    color: "green",  items: filtered.filter(r => r.status === "COMPLETED" || r.status === "CLOSED") },
  ];

  const laneColorMap: Record<string, string> = {
    blue:   "border-blue-500/30 bg-blue-500/5",
    purple: "border-purple-500/30 bg-purple-500/5",
    green:  "border-green-500/30 bg-green-500/5",
  };
  const laneDotMap: Record<string, string> = {
    blue: "bg-blue-400", purple: "bg-purple-400", green: "bg-green-400",
  };

  return (
    <div className="space-y-6">
      {/* Emergency banner */}
      {emergencyCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl">
          <span className="flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <p className="text-sm font-semibold text-red-400">
            {emergencyCount} EMERGENCY request{emergencyCount > 1 ? "s" : ""} require immediate attention
          </p>
          <button
            onClick={() => setPriorityFilter("EMERGENCY")}
            className="ml-auto text-xs px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-red-400 hover:bg-red-500/30 transition-colors"
          >
            View →
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open" value={stats.openCount} sub="Awaiting action" icon={Wrench} gradient="bg-gradient-to-br from-blue-500/10 to-cyan-600/5" border="border-blue-500/20" iconColor="text-blue-400" />
        <StatCard label="In Progress" value={stats.inProgressCount} sub="Being worked on" icon={Clock} gradient="bg-gradient-to-br from-purple-500/10 to-pink-600/5" border="border-purple-500/20" iconColor="text-purple-400" />
        <StatCard label="Completed" value={stats.completedCount} sub="Resolved" icon={CheckCircle} gradient="bg-gradient-to-br from-green-500/10 to-emerald-600/5" border="border-green-500/20" iconColor="text-green-400" />
        <StatCard label="Total Cost" value={`KES ${stats.totalCost.toLocaleString()}`} sub="Completed work" icon={TrendingUp} gradient="bg-gradient-to-br from-orange-500/10 to-red-600/5" border="border-orange-500/20" iconColor="text-orange-400" />
      </div>

      {/* Filters + view toggle */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requests..."
              className="w-full pl-8 pr-3 py-2 bg-gray-800/60 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
            />
          </div>

          {/* Dropdowns */}
          {[
            { value: propFilter, onChange: setPropFilter, opts: [["all", "All Properties"], ...properties.map(p => [p.id, p.name])] },
            { value: statusFilter, onChange: setStatusFilter, opts: [["all","All Status"],["OPEN","Open"],["PENDING","Pending"],["IN_PROGRESS","In Progress"],["COMPLETED","Completed"],["CLOSED","Closed"]] },
            { value: priorityFilter, onChange: setPriorityFilter, opts: [["all","All Priority"],["EMERGENCY","Emergency"],["HIGH","High"],["MEDIUM","Medium"],["LOW","Low"]] },
            { value: categoryFilter, onChange: setCategoryFilter, opts: [["all","All Category"], ...CATEGORIES.map(c => [c, c[0] + c.slice(1).toLowerCase()])] },
          ].map((f, i) => (
            <select
              key={i}
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              className="px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500/50 appearance-none cursor-pointer"
            >
              {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}

          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setPropFilter("all"); setStatusFilter("all"); setPriorityFilter("all"); setCategoryFilter("all"); }}
              className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors border border-gray-700 rounded-xl bg-gray-800/40"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}

          {/* View toggle */}
          <div className="ml-auto flex items-center gap-1 bg-gray-800/60 border border-gray-700 rounded-xl p-1">
            {(["swimlane", "grid"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${view === v ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "text-gray-500 hover:text-gray-300"}`}
              >
                {v === "swimlane" ? "Kanban" : "Grid"}
              </button>
            ))}
          </div>

          {onRefresh && (
            <button onClick={onRefresh} className="p-2 text-gray-500 hover:text-gray-300 transition-colors rounded-xl border border-gray-700 bg-gray-800/40">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Showing <span className="text-orange-400 font-medium">{filtered.length}</span> of {requests.length} requests
        </p>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-800/60 border border-gray-700 flex items-center justify-center mb-4">
            <Wrench className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No requests found</h3>
          <p className="text-sm text-gray-500 mb-4">{hasFilters ? "Try adjusting filters" : "No maintenance requests yet"}</p>
          {!hasFilters && (
            <Link href="/dashboard/maintenance/new" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-semibold rounded-xl">
              <Plus className="w-4 h-4" /> New Request
            </Link>
          )}
        </div>
      ) : view === "swimlane" ? (
        /* Kanban swimlane view */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {swimlanes.map((lane) => (
            <div key={lane.key} className={`rounded-2xl border ${laneColorMap[lane.color]} p-4`}>
              <div className="flex items-center gap-2 mb-4">
                <span className={`w-2 h-2 rounded-full ${laneDotMap[lane.color]}`} />
                <span className="text-sm font-bold text-white">{lane.label}</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-800/80 text-gray-400 font-medium">{lane.items.length}</span>
              </div>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700">
                {lane.items.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-600">Nothing here</div>
                ) : (
                  lane.items.map((req) => <RequestCard key={req.id} req={req} />)
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Grid view */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((req) => <RequestCard key={req.id} req={req} />)}
        </div>
      )}
    </div>
  );
}

// Plus icon re-export for use in page
function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
