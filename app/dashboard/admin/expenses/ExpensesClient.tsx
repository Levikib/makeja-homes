"use client";
import { useState, useMemo } from "react";
import { DollarSign, TrendingUp, Calendar, PieChart, Search, X, MapPin, Tag, ChevronDown, ChevronUp } from "lucide-react";

interface Expense {
  id: string; amount: number | any; category: string; description: string; date: Date;
  propertyId: string; paymentMethod: string | null; notes: string | null;
  properties: { id: string; name: string; };
}
interface Property { id: string; name: string; }
interface Stats { totalExpenses: number; thisMonthTotal: number; expenseCount: number; thisMonthCount: number; }
interface ExpensesClientProps { expenses: Expense[]; properties: Property[]; stats: Stats; }

const CATEGORY_COLORS: Record<string, string> = {
  UTILITIES:   "text-blue-400 bg-blue-500/10 border-blue-500/30",
  MAINTENANCE: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  SALARIES:    "text-green-400 bg-green-500/10 border-green-500/30",
  SUPPLIES:    "text-purple-400 bg-purple-500/10 border-purple-500/30",
  REPAIRS:     "text-red-400 bg-red-500/10 border-red-500/30",
  INSURANCE:   "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  TAXES:       "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  OTHER:       "text-gray-400 bg-gray-500/10 border-gray-500/30",
};

export default function ExpensesClient({ expenses, properties, stats }: ExpensesClientProps) {
  const [searchQuery, setSearchQuery]         = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [startDate, setStartDate]             = useState("");
  const [endDate, setEndDate]                 = useState("");
  const [expandedId, setExpandedId]           = useState<string | null>(null);
  const [showFilters, setShowFilters]         = useState(false);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch   = !searchQuery || e.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProp     = selectedProperty === "all" || e.propertyId === selectedProperty;
      const matchesCat      = selectedCategory === "all" || e.category === selectedCategory;
      const d               = new Date(e.date);
      const matchesStart    = !startDate || d >= new Date(startDate);
      const matchesEnd      = !endDate   || d <= new Date(endDate);
      return matchesSearch && matchesProp && matchesCat && matchesStart && matchesEnd;
    });
  }, [expenses, searchQuery, selectedProperty, selectedCategory, startDate, endDate]);

  const filteredTotal    = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const hasActiveFilters = searchQuery !== "" || selectedProperty !== "all" || selectedCategory !== "all" || startDate !== "" || endDate !== "";
  const clearFilters     = () => { setSearchQuery(""); setSelectedProperty("all"); setSelectedCategory("all"); setStartDate(""); setEndDate(""); };

  // Category breakdown from filtered
  const catBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of filteredExpenses) {
      m[e.category] = (m[e.category] ?? 0) + Number(e.amount);
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredExpenses]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track all property operating expenses</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-800/60 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400">Total Expenses</p>
            <DollarSign className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white">KSH {stats.totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">{stats.expenseCount} records</p>
        </div>
        <div className="bg-gray-800/60 border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400">This Month</p>
            <TrendingUp className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-orange-400">KSH {stats.thisMonthTotal.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">{stats.thisMonthCount} expenses</p>
        </div>
        <div className="bg-gray-800/60 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400">Filtered Total</p>
            <PieChart className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400">KSH {filteredTotal.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">{filteredExpenses.length} expenses</p>
        </div>
        <div className="bg-gray-800/60 border border-cyan-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400">Categories</p>
            <Tag className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-cyan-400">{[...new Set(expenses.map(e => e.category))].length}</p>
          <p className="text-xs text-gray-500 mt-0.5">expense types</p>
        </div>
      </div>

      {/* Category Breakdown Chips */}
      {catBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {catBreakdown.map(([cat, total]) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? "all" : cat)}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                selectedCategory === cat
                  ? (CATEGORY_COLORS[cat] || CATEGORY_COLORS.OTHER)
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {cat} · KSH {total.toLocaleString()}
            </button>
          ))}
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs px-3 py-1 rounded-full border border-gray-600 text-gray-400 hover:text-white flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-3 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500"
          >
            <option value="all">All Categories</option>
            {["UTILITIES","MAINTENANCE","SALARIES","SUPPLIES","REPAIRS","INSURANCE","TAXES","OTHER"].map(c => (
              <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg transition ${showFilters ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white'}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Dates
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <span className="text-xs text-gray-500 ml-auto">{filteredExpenses.length}/{expenses.length}</span>
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500" />
            </div>
            {properties.length > 0 && (
              <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)}
                className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500">
                <option value="all">All Properties</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Expenses Table */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-xl overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No expenses found</p>
            <p className="text-gray-500 text-sm mt-1">{hasActiveFilters ? "Try adjusting your filters" : "No expenses recorded yet"}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900/40">
                <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">Description</th>
                <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5 hidden md:table-cell">Property</th>
                <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">Amount</th>
                <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5 hidden sm:table-cell">Date</th>
                <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5 hidden lg:table-cell">Method</th>
                <th className="text-right text-xs font-medium text-gray-400 px-4 py-2.5">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense, i) => (
                <>
                  <tr
                    key={expense.id}
                    className={`border-b border-gray-700/50 hover:bg-gray-700/20 cursor-pointer transition ${i % 2 === 0 ? '' : 'bg-gray-900/20'}`}
                    onClick={() => setExpandedId(expandedId === expense.id ? null : expense.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white line-clamp-1">{expense.description}</div>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.OTHER}`}>
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-sm text-gray-300">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        {expense.properties?.name || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-red-400">KSH {Number(expense.amount).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-gray-400">{new Date(expense.date).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-400">{expense.paymentMethod || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {expandedId === expense.id
                        ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />}
                    </td>
                  </tr>
                  {expandedId === expense.id && (
                    <tr key={`${expense.id}-exp`} className="bg-gray-900/40 border-b border-gray-700/50">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Property</p>
                            <p className="text-gray-200">{expense.properties?.name || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Date</p>
                            <p className="text-gray-200">{new Date(expense.date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Payment Method</p>
                            <p className="text-gray-200">{expense.paymentMethod || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Amount</p>
                            <p className="text-red-400 font-semibold">KSH {Number(expense.amount).toLocaleString()}</p>
                          </div>
                          {expense.notes && (
                            <div className="col-span-full">
                              <p className="text-xs text-gray-500 mb-0.5">Notes</p>
                              <p className="text-gray-300">{expense.notes}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
