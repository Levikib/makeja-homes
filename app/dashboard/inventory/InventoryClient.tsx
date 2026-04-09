"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Package, AlertTriangle, Search, X, TrendingDown,
  BarChart2, DollarSign, Layers, ArrowUpRight, RefreshCw,
  Edit3, Filter,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  quantity: number;
  unitOfMeasure: string;
  unitCost: number;
  minimumQuantity?: number;
  propertyId?: string;
  properties?: { name: string } | null;
  updatedAt?: string | Date;
}

interface Props {
  items: InventoryItem[];
  properties: { id: string; name: string }[];
  onRefresh?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  PLUMBING:   "text-blue-400 bg-blue-500/10 border-blue-500/30",
  ELECTRICAL: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  CLEANING:   "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  TOOLS:      "text-orange-400 bg-orange-500/10 border-orange-500/30",
  SAFETY:     "text-red-400 bg-red-500/10 border-red-500/30",
  PAINTING:   "text-purple-400 bg-purple-500/10 border-purple-500/30",
  HARDWARE:   "text-gray-400 bg-gray-500/10 border-gray-500/30",
  OTHER:      "text-gray-400 bg-gray-500/10 border-gray-500/30",
};

function stockHealth(qty: number, min: number = 0): { label: string; color: string; bar: string; pct: number } {
  if (qty <= 0)       return { label: "Out of Stock", color: "text-red-400",    bar: "bg-red-500",    pct: 0 };
  if (qty <= min)     return { label: "Critical",     color: "text-red-400",    bar: "bg-red-500",    pct: Math.min((qty / Math.max(min * 2, 1)) * 100, 100) };
  if (qty <= min * 2) return { label: "Low",          color: "text-amber-400",  bar: "bg-amber-400",  pct: Math.min((qty / Math.max(min * 3, 1)) * 100, 100) };
  return               { label: "Good",          color: "text-emerald-400", bar: "bg-emerald-400", pct: 100 };
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

export default function InventoryClient({ items, properties, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [propFilter, setPropFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const categories = useMemo(() => [...new Set(items.map((i) => i.category))].sort(), [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()) &&
        !item.category.toLowerCase().includes(search.toLowerCase())) return false;
      if (catFilter !== "all" && item.category !== catFilter) return false;
      if (propFilter !== "all" && item.propertyId !== propFilter) return false;
      if (stockFilter === "low" && item.quantity > (item.minimumQuantity ?? 0)) return false;
      if (stockFilter === "ok"  && item.quantity <= (item.minimumQuantity ?? 0)) return false;
      return true;
    });
  }, [items, search, catFilter, propFilter, stockFilter]);

  const lowStockCount = items.filter(i => i.quantity <= (i.minimumQuantity ?? 0)).length;
  const outOfStock    = items.filter(i => i.quantity <= 0).length;
  const totalValue    = items.reduce((s, i) => s + i.quantity * (i.unitCost ?? 0), 0);

  const catBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(i => { map[i.category] = (map[i.category] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [items]);

  const hasFilters = search || catFilter !== "all" || propFilter !== "all" || stockFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-400">
            {lowStockCount} item{lowStockCount > 1 ? "s" : ""} need restocking
            {outOfStock > 0 ? ` — ${outOfStock} completely out of stock` : ""}
          </p>
          <button
            onClick={() => setStockFilter("low")}
            className="ml-auto text-xs px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400 hover:bg-amber-500/30 transition-colors"
          >
            View low stock →
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items"  value={items.length}                       sub="In inventory"       icon={Package}     gradient="bg-gradient-to-br from-emerald-500/10 to-green-600/5"  border="border-emerald-500/20" iconColor="text-emerald-400" />
        <StatCard label="Low Stock"    value={lowStockCount}                      sub={`${outOfStock} out of stock`} icon={TrendingDown} gradient="bg-gradient-to-br from-amber-500/10 to-orange-600/5"  border="border-amber-500/20"   iconColor="text-amber-400"   />
        <StatCard label="Total Value"  value={`KES ${totalValue.toLocaleString()}`} sub="Stock on hand"   icon={DollarSign}  gradient="bg-gradient-to-br from-blue-500/10 to-cyan-600/5"     border="border-blue-500/20"    iconColor="text-blue-400"    />
        <StatCard label="Categories"   value={categories.length}                  sub="Item types"         icon={Layers}      gradient="bg-gradient-to-br from-purple-500/10 to-pink-600/5"   border="border-purple-500/20"  iconColor="text-purple-400"  />
      </div>

      {/* Category breakdown + quick filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5" /> Category Breakdown
          </p>
          <div className="flex flex-wrap gap-2">
            {catBreakdown.length === 0 && (
              <span className="text-xs text-gray-600">No categories yet</span>
            )}
            {catBreakdown.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setCatFilter(catFilter === cat ? "all" : cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${catFilter === cat ? (CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.OTHER) : "border-gray-700 text-gray-400 bg-gray-800/40 hover:border-gray-600 hover:text-gray-200"}`}
              >
                {cat[0] + cat.slice(1).toLowerCase()}
                <span className="text-[10px] opacity-70">{count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" /> Quick Filter
          </p>
          {([ ["all", "All Stock", "bg-gray-500"], ["low", "Low / Out of Stock", "bg-amber-400"], ["ok", "Healthy Stock", "bg-emerald-400"] ] as [string, string, string][]).map(([v, l, dot]) => (
            <button
              key={v}
              onClick={() => setStockFilter(v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left ${stockFilter === v ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-gray-700 text-gray-400 bg-gray-800/40 hover:border-gray-600 hover:text-gray-200"}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Search + property filter */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-8 pr-3 py-2 bg-gray-800/60 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
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
              onClick={() => { setSearch(""); setCatFilter("all"); setPropFilter("all"); setStockFilter("all"); }}
              className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors border border-gray-700 rounded-xl bg-gray-800/40"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          {onRefresh && (
            <button onClick={onRefresh} className="p-2 text-gray-500 hover:text-gray-300 transition-colors rounded-xl border border-gray-700 bg-gray-800/40">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-xs text-gray-600">
            <span className="text-emerald-400 font-medium">{filtered.length}</span> of {items.length} items
          </span>
        </div>
      </div>

      {/* Items grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-800/60 border border-gray-700 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No items found</h3>
          <p className="text-sm text-gray-500 mb-4">{hasFilters ? "Try adjusting filters" : "Add your first inventory item"}</p>
          {!hasFilters && (
            <Link href="/dashboard/inventory/new" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-semibold rounded-xl">
              Add Item
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const health = stockHealth(item.quantity, item.minimumQuantity);
            const catColor = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.OTHER;
            const totalVal = item.quantity * (item.unitCost ?? 0);
            const isLow = item.quantity <= (item.minimumQuantity ?? 0);

            return (
              <div
                key={item.id}
                className={`group relative bg-gray-900/60 border rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01] hover:shadow-xl ${isLow ? "border-amber-500/30 hover:border-amber-500/50" : "border-gray-800 hover:border-gray-600"}`}
              >
                {isLow && (
                  <span className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {item.quantity <= 0 ? "OUT" : "LOW"}
                  </span>
                )}

                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-800/80 border border-gray-700 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-emerald-300 transition-colors">{item.name}</h3>
                    {item.description && <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>}
                  </div>
                </div>

                <div className="mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catColor}`}>
                    {item.category[0] + item.category.slice(1).toLowerCase()}
                  </span>
                  {item.properties?.name && (
                    <span className="ml-1.5 text-xs text-gray-600">{item.properties.name}</span>
                  )}
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Stock level</span>
                    <span className={`text-xs font-bold ${health.color}`}>
                      {item.quantity} {item.unitOfMeasure} · {health.label}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${health.bar}`}
                      style={{ width: `${Math.max(health.pct, 3)}%` }}
                    />
                  </div>
                  {(item.minimumQuantity ?? 0) > 0 && (
                    <p className="text-[10px] text-gray-600 mt-0.5">Reorder at: {item.minimumQuantity} {item.unitOfMeasure}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-800/80 mb-4">
                  <div>
                    <p className="text-[10px] text-gray-600">Unit cost</p>
                    <p className="text-xs font-semibold text-gray-300">KES {(item.unitCost ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-600">Total value</p>
                    <p className="text-xs font-bold text-white">KES {totalVal.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/inventory/${item.id}`}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-400 transition-all"
                  >
                    <ArrowUpRight className="w-3 h-3" /> View
                  </Link>
                  <Link
                    href={`/dashboard/inventory/${item.id}/edit`}
                    className="flex items-center justify-center px-3 py-2 bg-gray-800/60 border border-gray-700 hover:border-gray-600 rounded-xl text-xs text-gray-400 hover:text-white transition-all"
                  >
                    <Edit3 className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
