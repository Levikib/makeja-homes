"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet, Trash2, Search, Calendar } from "lucide-react";

interface Tenant {
  id: string;
  userId: string;
  unitNumber: string;
  propertyName: string;
  tenantName: string;
  email: string;
  rentAmount: number;
}

export default function BillingManagementPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [showGarbageModal, setShowGarbageModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  
  // Current date state
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/admin/tenants/active");
      if (!response.ok) throw new Error("Failed to fetch tenants");
      const data = await response.json();
      setTenants(data.tenants || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.unitNumber.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-200">Loading tenants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">Billing Management</h1>
          <p className="text-gray-300 mt-2 text-lg">Manage water readings and garbage fees</p>
        </div>
        
        {/* Current Date Display */}
        <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-purple-400" />
              <div>
                <p className="text-xs text-gray-300">Current Date</p>
                <p className="text-sm font-semibold text-white">{formatDate(currentDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-gray-900/50 border-purple-500/20">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by tenant name, email, or unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tenants List */}
      <Card className="bg-gray-900/50 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Active Tenants</CardTitle>
          <CardDescription className="text-gray-300">Add water readings and garbage fees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-4 text-gray-300 font-semibold text-sm">
                    Tenant
                  </th>
                  <th className="text-left py-4 px-4 text-gray-300 font-semibold text-sm">
                    Unit
                  </th>
                  <th className="text-left py-4 px-4 text-gray-300 font-semibold text-sm">
                    Property
                  </th>
                  <th className="text-right py-4 px-4 text-gray-300 font-semibold text-sm">
                    Monthly Rent
                  </th>
                  <th className="text-center py-4 px-4 text-gray-300 font-semibold text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-gray-800 hover:bg-purple-500/5 transition-colors">
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-white font-medium">{tenant.tenantName}</p>
                        <p className="text-gray-400 text-sm">{tenant.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-white font-medium">{tenant.unitNumber}</td>
                    <td className="py-4 px-4 text-white">{tenant.propertyName}</td>
                    <td className="py-4 px-4 text-right text-white font-semibold">
                      {formatCurrency(tenant.rentAmount)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setShowWaterModal(true);
                          }}
                          className="p-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all hover:scale-105"
                          title="Add Water Reading"
                        >
                          <Droplet className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setShowGarbageModal(true);
                          }}
                          className="p-3 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all hover:scale-105"
                          title="Set Garbage Fee"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTenants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      {search ? "No tenants found matching your search" : "No active tenants"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Water Reading Modal */}
      {showWaterModal && selectedTenant && (
        <WaterReadingModal
          tenant={selectedTenant}
          currentDate={currentDate}
          onClose={() => {
            setShowWaterModal(false);
            setSelectedTenant(null);
          }}
          onSuccess={() => {
            setShowWaterModal(false);
            setSelectedTenant(null);
          }}
        />
      )}

      {/* Garbage Fee Modal */}
      {showGarbageModal && selectedTenant && (
        <GarbageFeeModal
          tenant={selectedTenant}
          currentDate={currentDate}
          onClose={() => {
            setShowGarbageModal(false);
            setSelectedTenant(null);
          }}
          onSuccess={() => {
            setShowGarbageModal(false);
            setSelectedTenant(null);
          }}
        />
      )}
    </div>
  );
}

// Water Reading Modal Component
function WaterReadingModal({
  tenant,
  currentDate,
  onClose,
  onSuccess,
}: {
  tenant: Tenant;
  currentDate: Date;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [previousReading, setPreviousReading] = useState("");
  const [currentReading, setCurrentReading] = useState("");
  const [ratePerUnit, setRatePerUnit] = useState("150");
  const [selectedDate, setSelectedDate] = useState(
    currentDate.toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const unitsConsumed =
    currentReading && previousReading
      ? Math.max(0, parseFloat(currentReading) - parseFloat(previousReading))
      : 0;
  const amount = unitsConsumed * parseFloat(ratePerUnit || "0");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/billing/water-reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenant.id,
          unitId: tenant.unitNumber,
          previousReading: parseFloat(previousReading),
          currentReading: parseFloat(currentReading),
          ratePerUnit: parseFloat(ratePerUnit),
          billingDate: selectedDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add water reading");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg bg-gray-900 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white text-2xl flex items-center gap-2">
            <Droplet className="h-6 w-6 text-blue-400" />
            Add Water Reading
          </CardTitle>
          <CardDescription className="text-gray-300 text-base">
            {tenant.tenantName} - Unit {tenant.unitNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Billing Date Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                📅 Billing Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Current: {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Previous Reading
              </label>
              <input
                type="number"
                step="0.01"
                value={previousReading}
                onChange={(e) => setPreviousReading(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                placeholder="e.g., 100.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Current Reading
              </label>
              <input
                type="number"
                step="0.01"
                value={currentReading}
                onChange={(e) => setCurrentReading(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                placeholder="e.g., 150.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rate per Unit (KSh)
              </label>
              <input
                type="number"
                step="0.01"
                value={ratePerUnit}
                onChange={(e) => setRatePerUnit(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                placeholder="e.g., 150.00"
                required
              />
            </div>

            {/* Calculation Preview */}
            <div className="p-5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-gray-300">Units Consumed:</span>
                <span className="text-white font-semibold text-lg">{unitsConsumed.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-gray-300">Total Amount:</span>
                <span className="text-white font-bold text-xl">KSh {amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-xl transition disabled:opacity-50 font-medium"
              >
                {loading ? "Adding..." : "Add Reading"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Garbage Fee Modal Component
function GarbageFeeModal({
  tenant,
  currentDate,
  onClose,
  onSuccess,
}: {
  tenant: Tenant;
  currentDate: Date;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("500");
  const [isApplicable, setIsApplicable] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    currentDate.toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/billing/garbage-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenant.id,
          unitId: tenant.unitNumber,
          amount: parseFloat(amount),
          isApplicable,
          billingDate: selectedDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set garbage fee");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg bg-gray-900 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-white text-2xl flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-green-400" />
            Set Garbage Fee
          </CardTitle>
          <CardDescription className="text-gray-300 text-base">
            {tenant.tenantName} - Unit {tenant.unitNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Billing Date Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                📅 Billing Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/50"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Current: {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition">
                <input
                  type="checkbox"
                  checked={isApplicable}
                  onChange={(e) => setIsApplicable(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-700 text-green-500 focus:ring-green-500"
                />
                <span className="text-gray-300 font-medium">
                  Garbage fee is applicable for this unit
                </span>
              </label>
            </div>

            {isApplicable && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Monthly Fee (KSh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/50"
                  placeholder="e.g., 500.00"
                  required={isApplicable}
                />
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-xl transition disabled:opacity-50 font-medium"
              >
                {loading ? "Saving..." : "Save Fee"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}