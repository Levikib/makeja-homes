"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingCart, Clock, CheckCircle, Package, Search, X,
  MapPin, DollarSign, Calendar, Eye, RefreshCw, ArrowUpRight,
  Truck, FileEdit, Ban, AlertCircle, TrendingUp,
} from "lucide-react";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  status: string;
  totalAmount: number | any;
  orderDate: string | Date;
  expectedDelivery: string | Date | null;
  receivedDate: string | Date | null;
  notes?: string | null;
  propertyId: string;
  properties: { id: string; name: string } | null;
}

interface Stats {
  totalOrders: number;
  draftCount: number;
  pendingCount: number;
  approvedCount: number;
  receivedCount: number;
  cancelledCount: number;
  totalValue: number;
  pendingValue: number;
}

interface Props {
  orders: PurchaseOrder[];
  properties: { id: string; name: string }[];
  stats: Stats;
  onRefresh?: () => void;
}

const STATUS_CONFIG = {
  DRAFT:     { label: "Draft",     color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/30",   icon: FileEdit,     dot: "bg-gray-500"   },
  PENDING:   { label: "Pending",   color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", icon: Clock,      dot: "bg-yellow-400" },
  APPROVED:  { label: "Approved",  color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30",   icon: CheckCircle,  dot: "bg-blue-400"   },
  RECEIVED:  { label: "Received",  color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30",  icon: Truck,       dot: "bg-green-400"  },
  CANCELLED: { label: "Cancelled", color: "text-red-400",    bg: "bg-red-500/10 border-red-500/30",     icon: Ban,          dot: "bg-red-500"    },
} as const;

function daysAgo(date: string | Date) {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

function daysUntil(date: string | Date) {
  const d = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (d < 0)  return { label: `${Math.abs(d)}d overdue`, urgent: true };
  if (d === 0) return { label: "Due today", urgent: true };
  if (d === 1) return { label: "Due tomorrow", urgent: false };
  return { label: `Due in ${d}d`, urgent: false };
}

function StatCard({ label, value, sub, icon: Icon, gradient, border, iconColor }: {
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

function OrderCard({ order }: { order: PurchaseOrder }) {
  const sta = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.DRAFT;
  const StaIcon = sta.icon;
  const amount = Number(order.totalAmount ?? 0);
  const isPending = order.status === "PENDING" || order.status === "APPROVED";
  const delivery = order.expectedDelivery && isPending ? daysUntil(order.expectedDelivery) : null;

  return (
    <Link href={`/dashboard/purchase-orders/${order.id}`} className="block group">
      <div className={`relative bg-gray-900/60 border rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01] hover:shadow-xl ${isPending ? "border-blue-500/20 hover:border-blue-500/40" : "border-gray-800 hover:border-gray-600"}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-mono text-gray-500 mb-0.5">{order.orderNumber}</p>
            <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">{order.supplier}</h3>
          </div>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sta.bg} ${sta.color}`}>
            <StaIcon className="w-2.5 h-2.5" />
            {sta.label}
          </span>
        </div>

        {/* Property */}
        {order.properties?.name && (
          <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {order.properties.name}
          </p>
        )}

        {/* Dates */}
        <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {daysAgo(order.orderDate)}
          </span>
          {delivery && (
            <span className={`flex items-center gap-1 ${delivery.urgent ? "text-red-400 font-semibold" : "text-gray-400"}`}>
              <Truck className="w-3 h-3" />
              {delivery.label}
            </span>
          )}
          {order.receivedDate && (
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle className="w-3 h-3" />
              Received
            </span>
          )}
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-800/80">
          <div>
            <p className="text-[10px] text-gray-600">Total amount</p>
            <p className={`text-lg font-black ${isPending ? "text-blue-400" : "text-white"}`}>
              KES {amount.toLocaleString()}
            </p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-700 group-hover:text-blue-400 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

// ── Pipeline swimlane ─────────────────────────────────────────────────────────
const PIPELINE = [
  { key: "PENDING",  label: "Pending Approval", color: "yellow", dot: "bg-yellow-400", border: "border-yellow-500/20 bg-yellow-500/5" },
  { key: "APPROVED", label: "Approved / In Transit", color: "blue",   dot: "bg-blue-400",   border: "border-blue-500/20 bg-blue-500/5"   },
  { key: "RECEIVED", label: "Received",          color: "green",  dot: "bg-green-400",  border: "border-green-500/20 bg-green-500/5"  },
];

export default function PurchaseOrdersClient({ orders, properties, stats, onRefresh }: Props) {
  const [search, setSearch]   = useState("");
  const [propFilter, setPropFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"pipeline" | "grid">("pipeline");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (search && !o.orderNumber.toLowerCase().includes(search.toLowerCase()) &&
        !o.supplier.toLowerCase().includes(search.toLowerCase())) return false;
      if (propFilter !== "all" && o.propertyId !== propFilter) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      return true;
    });
  }, [orders, search, propFilter, statusFilter]);

  const hasFilters = search || propFilter !== "all" || statusFilter !== "all";

  const overdue = orders.filter(o =>
    o.expectedDelivery &&
    ["PENDING","APPROVED"].includes(o.status) &&
    new Date(o.expectedDelivery) < new Date()
  ).length;

  return (
    <div className="space-y-6">
      {/* Overdue banner */}
      {overdue > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-400">
            {overdue} order{overdue > 1 ? "s" : ""} past expected delivery date
          </p>
          <button
            onClick={() => setStatusFilter("APPROVED")}
            className="ml-auto text-xs px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Review →
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Orders"   value={stats.totalOrders}                          sub="All time"              icon={ShoppingCart} gradient="bg-gradient-to-br from-blue-500/10 to-cyan-600/5"    border="border-blue-500/20"   iconColor="text-blue-400"   />
        <StatCard label="Pending"         value={stats.pendingCount}                         sub="Awaiting approval"     icon={Clock}        gradient="bg-gradient-to-br from-yellow-500/10 to-amber-600/5"  border="border-yellow-500/20" iconColor="text-yellow-400" />
        <StatCard label="Received"        value={stats.receivedCount}                        sub="Successfully delivered" icon={Package}     gradient="bg-gradient-to-br from-green-500/10 to-emerald-600/5" border="border-green-500/20"  iconColor="text-green-400"  />
        <StatCard label="Pending Value"   value={`KES ${stats.pendingValue.toLocaleString()}`} sub="Committed spend"    icon={TrendingUp}   gradient="bg-gradient-to-br from-purple-500/10 to-pink-600/5"   border="border-purple-500/20" iconColor="text-purple-400" />
      </div>

      {/* Status pipeline mini-overview */}
      <div className="grid grid-cols-3 gap-3">
        {(["DRAFT","PENDING","APPROVED","RECEIVED","CANCELLED"] as const).map((s) => {
          const conf = STATUS_CONFIG[s];
          const count = orders.filter(o => o.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${statusFilter === s ? `${conf.bg} ${conf.color}` : "border-gray-800 bg-gray-900/40 text-gray-500 hover:border-gray-700 hover:text-gray-300"}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
              {conf.label}
              <span className="ml-auto font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters + view toggle */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order number, supplier..."
              className="w-full pl-8 pr-3 py-2 bg-gray-800/60 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <select
            value={propFilter}
            onChange={(e) => setPropFilter(e.target.value)}
            className="px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-xl text-sm text-white focus:outline-none appearance-none cursor-pointer"
          >
            <option value="all">All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setPropFilter("all"); setStatusFilter("all"); }}
              className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-xl bg-gray-800/40 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-1 bg-gray-800/60 border border-gray-700 rounded-xl p-1">
            {(["pipeline", "grid"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${view === v ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-gray-500 hover:text-gray-300"}`}
              >
                {v === "pipeline" ? "Pipeline" : "Grid"}
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
          Showing <span className="text-blue-400 font-medium">{filtered.length}</span> of {orders.length} orders
        </p>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-800/60 border border-gray-700 flex items-center justify-center mb-4">
            <ShoppingCart className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No orders found</h3>
          <p className="text-sm text-gray-500 mb-4">{hasFilters ? "Try adjusting filters" : "Create your first purchase order"}</p>
          {!hasFilters && (
            <Link href="/dashboard/purchase-orders/new" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white text-sm font-semibold rounded-xl">
              New Order
            </Link>
          )}
        </div>
      ) : view === "pipeline" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {PIPELINE.map((lane) => {
            const laneOrders = filtered.filter(o => o.status === lane.key);
            const others = lane.key === "PENDING" ? filtered.filter(o => o.status === "DRAFT") : [];
            const allInLane = [...laneOrders, ...others];
            return (
              <div key={lane.key} className={`rounded-2xl border ${lane.border} p-4`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-2 h-2 rounded-full ${lane.dot}`} />
                  <span className="text-sm font-bold text-white">{lane.label}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-800/80 text-gray-400 font-medium">{allInLane.length}</span>
                </div>
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700">
                  {allInLane.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-600">Nothing here</div>
                  ) : (
                    allInLane.map(o => <OrderCard key={o.id} order={o} />)
                  )}
                </div>
                {lane.key === "PENDING" && (
                  <Link href="/dashboard/purchase-orders/new" className="mt-3 flex items-center justify-center gap-1 py-2 border border-dashed border-gray-700 rounded-xl text-xs text-gray-500 hover:border-blue-500/40 hover:text-blue-400 transition-all">
                    + New Order
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(o => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
}
