"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { DollarSign, TrendingUp, Calendar, PieChart, Search, Filter, X, MapPin, Tag, Eye, Edit } from "lucide-react";

interface Expense {
  id: string; amount: number; category: string; description: string; date: Date;
  propertyId: string; paymentMethod: string | null; notes: string | null;
  properties: { id: string; name: string; };
}
interface Property { id: string; name: string; }
interface Stats { totalExpenses: number; thisMonthTotal: number; expenseCount: number; thisMonthCount: number; }
interface ExpensesClientProps { expenses: Expense[]; properties: Property[]; stats: Stats; }

const categoryColors: Record<string, string> = {
  UTILITIES: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  MAINTENANCE: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  SALARIES: "text-green-400 bg-green-500/10 border-green-500/30",
  SUPPLIES: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  REPAIRS: "text-red-400 bg-red-500/10 border-red-500/30",
  INSURANCE: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  TAXES: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  OTHER: "text-gray-400 bg-gray-500/10 border-gray-500/30",
};

export default function ExpensesClient({ expenses, properties, stats }: ExpensesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch = searchQuery === "" || expense.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProperty = selectedProperty === "all" || expense.propertyId === selectedProperty;
      const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory;
      const expenseDate = new Date(expense.date);
      const matchesStartDate = !startDate || expenseDate >= new Date(startDate);
      const matchesEndDate = !endDate || expenseDate <= new Date(endDate);
      return matchesSearch && matchesProperty && matchesCategory && matchesStartDate && matchesEndDate;
    });
  }, [expenses, searchQuery, selectedProperty, selectedCategory, startDate, endDate]);

  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const clearFilters = () => { setSearchQuery(""); setSelectedProperty("all"); setSelectedCategory("all"); setStartDate(""); setEndDate(""); };
  const hasActiveFilters = searchQuery !== "" || selectedProperty !== "all" || selectedCategory !== "all" || startDate !== "" || endDate !== "";

  return (<>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-gradient-to-br from-red-500/10 to-orange-600/10 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Total Expenses</h3>
          <DollarSign className="w-5 h-5 text-red-400" />
        </div>
        <p className="text-3xl font-bold text-white mb-1">KSH {stats.totalExpenses.toLocaleString()}</p>
        <p className="text-xs text-red-400">All time</p>
      </div>
      <div className="bg-gradient-to-br from-orange-500/10 to-yellow-600/10 border border-orange-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">This Month</h3>
          <TrendingUp className="w-5 h-5 text-orange-400" />
        </div>
        <p className="text-3xl font-bold text-white mb-1">KSH {stats.thisMonthTotal.toLocaleString()}</p>
        <p className="text-xs text-orange-400">{stats.thisMonthCount} expenses</p>
      </div>
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Total Count</h3>
          <Calendar className="w-5 h-5 text-purple-400" />
        </div>
        <p className="text-3xl font-bold text-white mb-1">{stats.expenseCount}</p>
        <p className="text-xs text-purple-400">All expenses</p>
      </div>
      <div className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Filtered Total</h3>
          <PieChart className="w-5 h-5 text-cyan-400" />
        </div>
        <p className="text-3xl font-bold text-white mb-1">KSH {filteredTotal.toLocaleString()}</p>
        <p className="text-xs text-cyan-400">{filteredExpenses.length} expenses</p>
      </div>
    </div>
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-red-400" />
        <h2 className="text-lg font-semibold text-white">Filters</h2>
        {hasActiveFilters && (<button onClick={clearFilters} className="ml-auto flex items-center gap-1 px-3 py-1 text-sm text-gray-400 hover:text-white"><X className="w-4 h-4" />Clear Filters</button>)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div><label className="block text-sm font-medium text-gray-300 mb-2"><Search className="w-4 h-4 inline mr-1" />Search</label><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Description..." className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-300 mb-2"><MapPin className="w-4 h-4 inline mr-1" />Property</label><select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:outline-none"><option value="all">All Properties</option>{properties.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
        <div><label className="block text-sm font-medium text-gray-300 mb-2"><Tag className="w-4 h-4 inline mr-1" />Category</label><select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:outline-none"><option value="all">All Categories</option><option value="UTILITIES">Utilities</option><option value="MAINTENANCE">Maintenance</option><option value="SALARIES">Salaries</option><option value="SUPPLIES">Supplies</option><option value="REPAIRS">Repairs</option><option value="INSURANCE">Insurance</option><option value="TAXES">Taxes</option><option value="OTHER">Other</option></select></div>
        <div><label className="block text-sm font-medium text-gray-300 mb-2"><Calendar className="w-4 h-4 inline mr-1" />Start Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-300 mb-2"><Calendar className="w-4 h-4 inline mr-1" />End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:outline-none" /></div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700"><p className="text-sm text-gray-400">Showing <span className="text-red-400 font-semibold">{filteredExpenses.length}</span> of <span className="text-white font-semibold">{expenses.length}</span> expenses</p></div>
    </div>
    {filteredExpenses.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredExpenses.map((expense) => (
        <div key={expense.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-red-500/50 transition-all">
          <div className="flex items-start justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${categoryColors[expense.category] || categoryColors.OTHER}`}>{expense.category}</span>
            <span className="text-sm text-gray-400">{new Date(expense.date).toLocaleDateString()}</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">{expense.description}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4"><MapPin className="w-4 h-4" /><span>{expense.properties.name}</span></div>
          <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-2xl font-bold text-white">KSH {Number(expense.amount).toLocaleString()}</p>
            {expense.paymentMethod && (<p className="text-xs text-gray-400 mt-1">{expense.paymentMethod}</p>)}
          </div>
        </div>
      ))}</div>
    ) : (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
        <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">No expenses found</h2>
        <p className="text-gray-400 mb-6">{hasActiveFilters ? "Try adjusting your filters" : "Add your first expense to get started"}</p>
      </div>
    )}
  </>);
}
