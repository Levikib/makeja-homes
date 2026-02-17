"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Download } from "lucide-react";

export default function GarbageManagementPage() {
  const router = useRouter();
  const [garbageFees, setGarbageFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFees: 0,
    totalRevenue: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    fetchGarbageFees();
    fetchProperties();
  }, []);

  const fetchGarbageFees = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/garbage-fees/history");
      if (response.ok) {
        const data = await response.json();
        setGarbageFees(data.fees || []);
        calculateStats(data.fees || []);
      }
    } catch (error) {
      console.error("Error fetching garbage fees:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await fetch("/api/admin/properties");
      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties || []);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  const calculateStats = (fees: any[]) => {
    const totalFees = fees.length;
    const totalRevenue = fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    setStats({ totalFees, totalRevenue });
  };

  const filteredFees = garbageFees.filter((fee) => {
    const matchesSearch =
      fee.tenants?.users?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.tenants?.users?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.tenants?.units?.unitNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.tenants?.units?.properties?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const feeDate = new Date(fee.month);
    const matchesProperty =
      selectedProperty === "all" || fee.tenants?.units?.properties?.id === selectedProperty;
    const matchesMonth =
      selectedMonth === "all" || (feeDate.getMonth() + 1).toString() === selectedMonth;
    const matchesYear = feeDate.getFullYear().toString() === selectedYear;

    return matchesSearch && matchesProperty && matchesMonth && matchesYear;
  });

  const exportToCSV = () => {
    const headers = ["Date", "Tenant", "Unit", "Property", "Amount", "Status"];
    const rows = filteredFees.map((fee) => {
      const feeDate = new Date(fee.month);
      return [
        feeDate.toLocaleDateString(),
        `${fee.tenants?.users?.firstName} ${fee.tenants?.users?.lastName}`,
        fee.tenants?.units?.unitNumber,
        fee.tenants?.units?.properties?.name,
        fee.amount,
        fee.status,
      ];
    });

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `garbage-fees-${selectedYear}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/dashboard/admin/utilities")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Utilities
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <Trash2 className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Garbage Fee Management</h1>
              <p className="text-gray-400">Complete garbage fee history & analytics</p>
            </div>
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
          >
            <Download className="h-5 w-5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Fees</p>
              <p className="text-3xl font-bold text-white">{stats.totalFees}</p>
            </div>
            <Trash2 className="h-12 w-12 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold text-green-400">Ksh {stats.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="text-green-400">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search tenant, unit, property..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Properties</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.name}
              </option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Garbage Fee History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredFees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No garbage fees found
                  </td>
                </tr>
              ) : (
                filteredFees.map((fee) => {
                  const feeDate = new Date(fee.month);
                  return (
                    <tr key={fee.id} className="hover:bg-gray-700/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {feeDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {fee.tenants?.users?.firstName} {fee.tenants?.users?.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {fee.tenants?.units?.unitNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {fee.tenants?.units?.properties?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-400">
                        Ksh {fee.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            fee.status === "PENDING"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-green-500/20 text-green-400"
                          }`}
                        >
                          {fee.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
