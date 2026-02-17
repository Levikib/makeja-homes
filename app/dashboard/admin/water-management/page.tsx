"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Droplet,
  Search,
  Download,
  Edit2,
  Eye,
  Filter,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Building,
  Users,
  BarChart3,
  ArrowLeft,
} from "lucide-react";

interface WaterReading {
  id: string;
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  ratePerUnit: number;
  amountDue: number;
  readingDate: string;
  month: number;
  year: number;
  tenant: {
    firstName: string;
    lastName: string;
    email: string;
  };
  unit: {
    unitNumber: string;
  };
  property: {
    name: string;
  };
}

interface Stats {
  totalReadings: number;
  totalConsumption: number;
  totalRevenue: number;
  averageConsumption: number;
  highestConsumer: {
    tenant: string;
    consumption: number;
  } | null;
}

export default function WaterManagementPage() {
  const router = useRouter();
  const [readings, setReadings] = useState<WaterReading[]>([]);
  const [allProperties, setAllProperties] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReading, setSelectedReading] = useState<WaterReading | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  // Edit form
  const [editForm, setEditForm] = useState({
    previousReading: "",
    currentReading: "",
    ratePerUnit: "",
  });

  useEffect(() => {
    fetchReadings();
    fetchStats();
    fetchProperties();
  }, [propertyFilter, monthFilter, yearFilter]);


  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/admin/properties/list');
      if (response.ok) {
        const data = await response.json();
        setAllProperties(data.properties.map((p: any) => p.name));
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  const fetchReadings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        property: propertyFilter,
        month: monthFilter,
        year: yearFilter,
      });

      const response = await fetch(`/api/admin/water-readings/list?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReadings(data.readings);
      }
    } catch (error) {
      console.error("Error fetching readings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({
        property: propertyFilter,
        month: monthFilter,
        year: yearFilter,
      });

      const response = await fetch(`/api/admin/water-readings/stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleEdit = (reading: WaterReading) => {
    setSelectedReading(reading);
    setEditForm({
      previousReading: reading.previousReading.toString(),
      currentReading: reading.currentReading.toString(),
      ratePerUnit: reading.ratePerUnit.toString(),
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedReading) return;

    try {
      const prev = parseFloat(editForm.previousReading);
      const curr = parseFloat(editForm.currentReading);
      const rate = parseFloat(editForm.ratePerUnit);

      if (curr < prev) {
        alert("Current reading cannot be less than previous reading");
        return;
      }

      const usage = curr - prev;
      const amountDue = usage * rate;

      const response = await fetch("/api/admin/water-readings/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedReading.id,
          previousReading: prev,
          currentReading: curr,
          ratePerUnit: rate,
          unitsConsumed: usage,
          amountDue,
        }),
      });

      if (response.ok) {
        alert("Reading updated successfully!");
        setShowEditModal(false);
        fetchReadings();
        fetchStats();
      }
    } catch (error) {
      console.error("Error updating reading:", error);
      alert("Failed to update reading");
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ["Date", "Tenant", "Unit", "Property", "Previous", "Current", "Usage", "Rate", "Amount"],
      ...filteredReadings.map(r => [
        new Date(r.readingDate).toLocaleDateString(),
        `${r.tenant.firstName} ${r.tenant.lastName}`,
        r.unit.unitNumber,
        r.property.name,
        r.previousReading,
        r.currentReading,
        r.unitsConsumed,
        r.ratePerUnit,
        r.amountDue,
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `water-readings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredReadings = readings.filter((reading) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      reading.tenant.firstName.toLowerCase().includes(searchLower) ||
      reading.tenant.lastName.toLowerCase().includes(searchLower) ||
      reading.unit.unitNumber.toLowerCase().includes(searchLower) ||
      reading.property.name.toLowerCase().includes(searchLower);

    return matchesSearch;
  });

  // Get unique properties from readings (for current filter)
  const uniqueProperties = Array.from(
    new Set(readings.map(r => r.property.name))
  );
  
  // TODO: Fetch all properties from API if you want to show all
  // For now, this shows only properties with readings

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push("/dashboard/admin/utilities")}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
      >
        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Utilities</span>
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">💧 Water Management</h1>
          <p className="text-gray-400 mt-1">Complete water readings history & analytics</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900/50 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Readings</p>
                  <p className="text-2xl font-bold text-white">{stats.totalReadings}</p>
                </div>
                <Droplet className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-cyan-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Consumption</p>
                  <p className="text-2xl font-bold text-cyan-400">{stats.totalConsumption.toLocaleString()} units</p>
                </div>
                <TrendingUp className="h-8 w-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Avg Consumption</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.averageConsumption.toFixed(1)} units</p>
                </div>
                <Users className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tenant, unit, property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Properties</option>
              {allProperties.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Months</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Readings Table */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Water Readings History</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReadings.length === 0 ? (
            <div className="text-center py-12">
              <Droplet className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">No readings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Tenant</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Unit</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Property</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Previous</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Current</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Usage</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Amount</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReadings.map((reading) => (
                    <tr key={reading.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition">
                      <td className="py-3 px-4 text-sm text-white">
                        {new Date(reading.readingDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-white">
                        {reading.tenant.firstName} {reading.tenant.lastName}
                      </td>
                      <td className="py-3 px-4 text-sm text-white">{reading.unit.unitNumber}</td>
                      <td className="py-3 px-4 text-sm text-gray-400">{reading.property.name}</td>
                      <td className="py-3 px-4 text-sm text-right text-white">{reading.previousReading}</td>
                      <td className="py-3 px-4 text-sm text-right text-white">{reading.currentReading}</td>
                      <td className="py-3 px-4 text-sm text-right text-cyan-400 font-semibold">
                        {reading.unitsConsumed}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-400">
                        {reading.ratePerUnit} KSh
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-green-400 font-bold">
                        {formatCurrency(reading.amountDue)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleEdit(reading)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition"
                          title="Edit Reading"
                        >
                          <Edit2 className="h-4 w-4 text-blue-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {showEditModal && selectedReading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-gray-900 border-gray-700 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white">Edit Water Reading</CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                {selectedReading.tenant.firstName} {selectedReading.tenant.lastName} - Unit {selectedReading.unit.unitNumber}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Previous Reading
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.previousReading}
                  onChange={(e) => setEditForm({ ...editForm, previousReading: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Reading
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.currentReading}
                  onChange={(e) => setEditForm({ ...editForm, currentReading: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rate per Unit (KSh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.ratePerUnit}
                  onChange={(e) => setEditForm({ ...editForm, ratePerUnit: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {editForm.previousReading && editForm.currentReading && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">New Usage:</span>
                    <span className="text-white font-semibold">
                      {(parseFloat(editForm.currentReading) - parseFloat(editForm.previousReading)).toFixed(2)} units
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-300">New Amount:</span>
                    <span className="text-white font-bold text-lg">
                      {formatCurrency(
                        (parseFloat(editForm.currentReading) - parseFloat(editForm.previousReading)) *
                        parseFloat(editForm.ratePerUnit || "0")
                      )}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                >
                  Save Changes
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
