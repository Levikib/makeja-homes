"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Droplet, Trash2, Search, Calendar, Settings, ArrowLeft,
  CheckCircle, XCircle, X, History, Users, AlertCircle, Clock
} from "lucide-react";

interface Tenant {
  id: string;
  unitId: string;
  rentAmount: number;
  users: { firstName: string; lastName: string; email: string };
  units: { unitNumber: string; status: string; properties: { id: string; name: string; defaultWaterRate?: number; defaultGarbageFee?: number } };
  water_readings?: any[];
  garbage_fees?: any[];
  lease_agreements?: any[];
}

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
}

interface GarbageFee {
  id: string;
  amount: number;
  month: string;
  status: string;
}

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

export default function UtilitiesManagementPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [filterMode, setFilterMode] = useState<"all" | "pending" | "overdue">("all");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentDate] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);

  // Utility Stats
  const [utilityStats, setUtilityStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Property Pricing Modal
  const [showPropertyPricingModal, setShowPropertyPricingModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [propertyPricing, setPropertyPricing] = useState({ waterRate: "50", garbageFee: "500" });

  // Water Modal
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [waterData, setWaterData] = useState<any>({
    previousReading: "",
    currentReading: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    ratePerUnit: "50",
    missingMonths: [],
    canEditPrevious: false,
  });
  const [existingReading, setExistingReading] = useState<any>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Garbage Modal
  const [showGarbageModal, setShowGarbageModal] = useState(false);
  const [garbageData, setGarbageData] = useState<any>({
    amount: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [waterHistory, setWaterHistory] = useState<WaterReading[]>([]);
  const [garbageHistory, setGarbageHistory] = useState<GarbageFee[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Overdue alert
  const [showOverdueAlert, setShowOverdueAlert] = useState(false);
  const [overdueAlertDismissed, setOverdueAlertDismissed] = useState(false);

  useEffect(() => {
    fetchTenants();
    fetchUtilityStats();
  }, []);

  useEffect(() => {
    if (utilityStats?.water?.overdue > 0 && !overdueAlertDismissed) {
      setShowOverdueAlert(true);
    }
  }, [utilityStats]);

  // Fetch property rates when selectedProperty changes
  useEffect(() => {
    const fetchPropertyRates = async () => {
      if (selectedProperty?.id) {
        try {
          const response = await fetch(`/api/admin/properties/${selectedProperty.id}/rates`);
          if (response.ok) {
            const data = await response.json();
            setPropertyPricing({
              waterRate: data.property.defaultWaterRate?.toString() || "50",
              garbageFee: data.property.defaultGarbageFee?.toString() || "500",
            });
          }
        } catch (error) {
          console.error("Error fetching property rates:", error);
        }
      }
    };
    fetchPropertyRates();
  }, [selectedProperty]);

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

  const fetchUtilityStats = async () => {
    try {
      setLoadingStats(true);
      const response = await fetch("/api/admin/utilities/stats");
      if (response.ok) {
        const data = await response.json();
        console.log("Stats received:", data);
        setUtilityStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const showToast = (type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const autoGenerateGarbageFees = async (tenantId: string) => {
    try {
      console.log("🤖 Triggering auto-generation for tenant:", tenantId);
      const response = await fetch("/api/admin/garbage-fees/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Auto-generated ${data.generated} garbage fees`);
        return data.generated;
      }
      return 0;
    } catch (error) {
      console.error("❌ Error auto-generating:", error);
      return 0;
    }
  };

  const fetchTenantHistory = async (tenantId: string) => {
    setLoadingHistory(true);
    try {
      console.log("🔥 FETCHING:", tenantId);
      const response = await fetch(`/api/admin/tenants/history?tenantId=${tenantId}`);
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      console.log("🔥 DATA:", data);

      const waterReadings = data.tenant?.water_readings || [];
      const garbageFees = data.tenant?.garbage_fees || [];

      console.log("🔥 WATER:", waterReadings.length, "GARBAGE:", garbageFees.length);
      setWaterHistory(waterReadings);
      setGarbageHistory(garbageFees);

      if (waterReadings.length > 0) {
        const lastReading = waterReadings[0];
        setWaterData((prev: any) => ({
          ...prev,
          previousReading: lastReading.currentReading.toString(),
          canEditPrevious: false,
        }));
      } else {
        setWaterData((prev: any) => ({ ...prev, previousReading: "0", canEditPrevious: true }));
      }
    } catch (error) {
      console.error("🔥 ERROR:", error);
      showToast("error", "Failed to load history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewDetails = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowDetailsModal(true);
    console.log("🤖 Auto-generating garbage fees...");
    await autoGenerateGarbageFees(tenant.id);
    await fetchTenantHistory(tenant.id);
    await fetchTenants();
  };

  const handleAddWater = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowDuplicateWarning(false);
    setExistingReading(null);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Fetch property rates
    let rate = 50;
    try {
      const propertyId = tenant.units.properties.id;
      const rateRes = await fetch(`/api/admin/properties/${propertyId}/rates`);
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        rate = rateData.property.waterRatePerUnit || 50;
      }
    } catch (error) {
      console.error("Error fetching property rates:", error);
    }

    // Fetch full history
    const histRes = await fetch(`/api/admin/tenants/history?tenantId=${tenant.id}`);
    if (!histRes.ok) { setShowWaterModal(true); return; }
    const histData = await histRes.json();
    const readings = (histData.tenant?.water_readings || []).sort((a: any, b: any) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    // Get lease start date
    const leaseStart = histData.tenant?.lease_agreements?.[0]?.startDate
      ? new Date(histData.tenant.lease_agreements[0].startDate)
      : new Date(tenant.users?.createdAt || Date.now());

    const leaseStartMonth = leaseStart.getMonth() + 1;
    const leaseStartYear = leaseStart.getFullYear();

    // Find ALL missing months from lease start to current
    const existingKeys = new Set(readings.map((r: any) => `${r.month}-${r.year}`));
    const missingMonths: { month: number; year: number }[] = [];

    let checkYear = leaseStartYear;
    let checkMonth = leaseStartMonth;
    while (checkYear < currentYear || (checkYear === currentYear && checkMonth <= currentMonth)) {
      if (!existingKeys.has(`${checkMonth}-${checkYear}`)) {
        missingMonths.push({ month: checkMonth, year: checkYear });
      }
      checkMonth++;
      if (checkMonth > 12) { checkMonth = 1; checkYear++; }
    }

    // Target the EARLIEST missing month
    const targetMonth = missingMonths.length > 0 ? missingMonths[0].month : currentMonth;
    const targetYear = missingMonths.length > 0 ? missingMonths[0].year : currentYear;

    // Get previous reading for target month
    const prevReading = readings.find((r: any) => {
      const prevM = targetMonth === 1 ? 12 : targetMonth - 1;
      const prevY = targetMonth === 1 ? targetYear - 1 : targetYear;
      return r.month === prevM && r.year === prevY;
    });

    // Check if target month already has a reading
    const existingForTarget = readings.find((r: any) => r.month === targetMonth && r.year === targetYear);
    if (existingForTarget) {
      setExistingReading(existingForTarget);
      setShowDuplicateWarning(true);
    }

    console.log("=== OPENING WATER MODAL ===");
    console.log("Tenant:", tenant.users.firstName, tenant.users.lastName);
    console.log("Target month:", targetMonth + "/" + targetYear);
    console.log("Missing months:", missingMonths.length);
    console.log("Previous reading:", prevReading?.currentReading || 0);

    setWaterData({
      previousReading: prevReading ? prevReading.currentReading.toString() : (readings.length === 0 ? "0" : readings[0].currentReading.toString()),
      currentReading: "",
      month: targetMonth,
      year: targetYear,
      ratePerUnit: rate.toString(),
      missingMonths,
      canEditPrevious: !prevReading && readings.length === 0,
    });

    setShowWaterModal(true);
  };

  const handleAddGarbageFee = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
      const propertyId = tenant.units.properties.id;
      const response = await fetch(`/api/admin/properties/${propertyId}/rates`);
      if (response.ok) {
        const data = await response.json();
        const fee = data.property.defaultGarbageFee || 500;
        setGarbageData((prev: any) => ({
          ...prev,
          amount: fee.toString(),
          month: currentMonth,
          year: currentYear,
        }));
      }
    } catch (error) {
      console.error("Error fetching property rates:", error);
    }

    setShowGarbageModal(true);
  };

  const checkExistingReading = async (tenantId: string, month: number, year: number, type: string) => {
    try {
      const response = await fetch(
        `/api/admin/tenants/history?tenantId=${tenantId}`
      );
      if (response.ok) {
        const data = await response.json();
        if (type === "water") {
          const readings = data.tenant?.water_readings || [];
          const existing = readings.find((r: any) => r.month === month && r.year === year);
          if (existing) {
            setExistingReading(existing);
            setShowDuplicateWarning(true);
            return true;
          }
        }
      }
      setExistingReading(null);
      setShowDuplicateWarning(false);
      return false;
    } catch (error) {
      return false;
    }
  };

  const handleWaterSubmit = async () => {
    if (!selectedTenant) return;

    if (existingReading &&
      existingReading.month === waterData.month &&
      existingReading.year === waterData.year) {
      showToast("error", `Cannot create duplicate for ${new Date(0, waterData.month - 1).toLocaleString("default", { month: "long" })} ${waterData.year}. Use Water Management to edit.`);
      setShowWaterModal(false);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/water-readings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedTenant.id,
          unitId: selectedTenant.unitId,
          previousReading: parseFloat(waterData.previousReading),
          currentReading: parseFloat(waterData.currentReading),
          usage: Math.max(0, parseFloat(waterData.currentReading) - parseFloat(waterData.previousReading)),
          ratePerUnit: parseFloat(waterData.ratePerUnit),
          amountDue: Math.max(0, parseFloat(waterData.currentReading) - parseFloat(waterData.previousReading)) * parseFloat(waterData.ratePerUnit),
          month: waterData.month,
          year: waterData.year,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add water reading");
      }

      showToast("success", "Water reading added successfully!");
      setShowWaterModal(false);
      await fetchTenants();
      await fetchUtilityStats();
    } catch (error: any) {
      showToast("error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGarbageSubmit = async () => {
    if (!selectedTenant) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/garbage-fees/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedTenant.id,
          unitId: selectedTenant.unitId,
          amount: parseFloat(garbageData.amount),
          month: new Date(garbageData.year, garbageData.month - 1, 1).toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save garbage fee");
      }

      showToast("success", "Garbage fee saved!");
      setShowGarbageModal(false);
      await fetchTenants();
    } catch (error: any) {
      showToast("error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePropertyRates = async () => {
    if (!selectedProperty) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/properties/${selectedProperty.id}/rates`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waterRatePerUnit: parseFloat(propertyPricing.waterRate),
          defaultGarbageFee: parseFloat(propertyPricing.garbageFee),
        }),
      });

      if (!response.ok) throw new Error("Failed to update rates");
      showToast("success", `Rates updated for ${selectedProperty.name}!`);
      setShowPropertyPricingModal(false);
      setSelectedProperty(null);
    } catch (error: any) {
      showToast("error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(amount);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const uniqueProperties = Array.from(
    new Map(tenants.map((t) => [t.units.properties.id, t.units.properties])).values()
  );

  const filteredTenants = tenants.filter((t) => {
    const name = `${t.users.firstName} ${t.users.lastName}`.toLowerCase();
    const matchesSearch =
      search === "" ||
      name.includes(search.toLowerCase()) ||
      t.users.email.toLowerCase().includes(search.toLowerCase()) ||
      t.units.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.units.properties.name.toLowerCase().includes(search.toLowerCase());

    const matchesProperty = propertyFilter === "all" || t.units.properties.id === propertyFilter;

    let matchesMode = true;
    if (filterMode === "pending" && utilityStats?.water?.pendingTenantIds) {
      matchesMode = utilityStats.water.pendingTenantIds.includes(t.id);
    } else if (filterMode === "overdue" && utilityStats?.water?.overdueTenantIds) {
      matchesMode = utilityStats.water.overdueTenantIds.includes(t.id);
    }

    return matchesProperty && matchesSearch && matchesMode;
  });

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
    <div className="space-y-8 p-6">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[10000] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${
              toast.type === "success" ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <p className="font-medium">{toast.message}</p>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-4 hover:opacity-80">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Back Button */}
      <button
        onClick={() => router.push("/dashboard/admin")}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
      >
        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Dashboard</span>
      </button>

      {/* Header */}
      <div>
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">Utilities Management</h1>
          <p className="text-gray-300 mt-2 text-lg">Manage water, garbage, and other utility charges</p>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => setShowPropertyPricingModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2 shadow-lg"
          >
            <Settings className="h-5 w-5" />
            <span>Property Rates</span>
          </button>

          <button
            onClick={() => router.push("/dashboard/admin/water-management")}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all flex items-center gap-2 shadow-lg"
          >
            <History className="h-5 w-5" />
            <span>Water History</span>
          </button>

          <button
            onClick={() => router.push("/dashboard/admin/garbage-management")}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all flex items-center gap-2 shadow-lg"
          >
            <Trash2 className="h-5 w-5" />
            <span>Garbage History</span>
          </button>

          <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30 ml-auto">
            <CardContent className="pt-3 pb-3 px-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-xs text-gray-300">Current Date</p>
                  <p className="text-sm font-semibold text-white">{formatDate(currentDate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Overdue Alert */}
      {showOverdueAlert && !overdueAlertDismissed && utilityStats?.water?.overdue > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <div>
              <p className="text-red-300 font-semibold">⚠️ {utilityStats.water.overdue} tenants have overdue water readings!</p>
              <p className="text-red-400 text-sm">These tenants are missing readings from previous months.</p>
            </div>
          </div>
          <button
            onClick={() => { setOverdueAlertDismissed(true); setShowOverdueAlert(false); setFilterMode("overdue"); }}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm"
          >
            View Overdue
          </button>
        </div>
      )}

      {/* Stat Cards - 4 Actionable Only */}
      {loadingStats ? (
        <div className="flex items-center gap-3 text-gray-400">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
          <span>Loading stats...</span>
        </div>
      ) : utilityStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Water - OVERDUE */}
          <Card
            className={`bg-gradient-to-br from-red-900/40 to-red-700/40 border-red-500/30 cursor-pointer hover:border-red-500/60 hover:scale-105 transition-all ${utilityStats.water.overdue > 0 ? "animate-pulse" : ""}`}
            onClick={() => { setFilterMode("overdue"); setTimeout(() => document.querySelector("h2")?.scrollIntoView({ behavior: "smooth" }), 100); }}
          >
            <CardContent className="pt-3 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-200 text-xs font-medium">Water - OVERDUE</p>
                  <p className="text-2xl font-bold text-white mt-1">{utilityStats.water.overdue}</p>
                  <p className="text-xs text-red-300">missing past months</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <XCircle className="h-6 w-6 text-red-300" />
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">⚠ CRITICAL</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Water - Pending */}
          <Card
            className="bg-gradient-to-br from-yellow-900/40 to-yellow-700/40 border-yellow-500/30 cursor-pointer hover:border-yellow-500/60 transition-all"
            onClick={() => setFilterMode("pending")}
          >
            <CardContent className="pt-3 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-200 text-xs font-medium">Water - Pending</p>
                  <p className="text-2xl font-bold text-white mt-1">{utilityStats.water.pending}</p>
                  <p className="text-xs text-yellow-300">not yet recorded this month</p>
                </div>
                <Droplet className="h-6 w-6 text-yellow-300" />
              </div>
            </CardContent>
          </Card>

          {/* Garbage - OVERDUE */}
          <Card className="bg-gradient-to-br from-red-900/40 to-red-700/40 border-red-500/30">
            <CardContent className="pt-3 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-200 text-xs font-medium">Garbage - OVERDUE</p>
                  <p className="text-2xl font-bold text-white mt-1">{utilityStats.garbage?.overdue || 0}</p>
                  <p className="text-xs text-red-300">missing past months</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <XCircle className="h-6 w-6 text-red-300" />
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">⚠ CRITICAL</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Garbage - Pending */}
          <Card className="bg-gradient-to-br from-yellow-900/40 to-yellow-700/40 border-yellow-500/30">
            <CardContent className="pt-3 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-200 text-xs font-medium">Garbage - Pending</p>
                  <p className="text-2xl font-bold text-white mt-1">{utilityStats.garbage?.pending || 0}</p>
                  <p className="text-xs text-yellow-300">not yet recorded this month</p>
                </div>
                <Trash2 className="h-6 w-6 text-yellow-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Filter Mode Indicator */}
      {filterMode !== "all" && (
        <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <span className="text-gray-300 text-sm">
            Filtering: <span className={`font-semibold ${filterMode === "overdue" ? "text-red-400" : "text-yellow-400"}`}>{filterMode.toUpperCase()}</span> tenants
          </span>
          <button
            onClick={() => setFilterMode("all")}
            className="ml-auto text-xs px-3 py-1 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Search and Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tenant name, email, unit, or property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50"
          />
        </div>
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
        >
          <option value="all">All Properties ({tenants.length} tenants)</option>
          {uniqueProperties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name} ({tenants.filter(t => t.units.properties.id === property.id).length} tenants)
            </option>
          ))}
        </select>
      </div>

      {/* Active Tenants */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Active Tenants ({filteredTenants.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => {
            const hasWaterThisMonth = tenant.water_readings?.some(
              (r: any) => r.month === new Date().getMonth() + 1 && r.year === new Date().getFullYear()
            );
            const hasWaterLastMonth = tenant.water_readings?.some(
              (r: any) => {
                const lm = new Date().getMonth() === 0 ? 12 : new Date().getMonth();
                const ly = new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear();
                return r.month === lm && r.year === ly;
              }
            );
            const isOverdue = !hasWaterLastMonth;
            const isPending = !hasWaterThisMonth;

            return (
              <Card
                key={tenant.id}
                className={`bg-gray-800/50 border transition-all hover:scale-[1.02] ${
                  isOverdue ? "border-red-500/40 hover:border-red-500/60" :
                  isPending ? "border-yellow-500/30 hover:border-yellow-500/50" :
                  "border-gray-700 hover:border-purple-500/50"
                }`}
              >
                <CardContent className="pt-6">
                  {/* Status Badge */}
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full mb-3">
                      <AlertCircle className="h-3 w-3" /> OVERDUE
                    </span>
                  )}
                  {!isOverdue && isPending && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full mb-3">
                      <Clock className="h-3 w-3" /> PENDING
                    </span>
                  )}
                  {!isOverdue && !isPending && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full mb-3">
                      <CheckCircle className="h-3 w-3" /> RECORDED
                    </span>
                  )}

                  <h3 className="text-white font-bold text-lg">{tenant.users.firstName} {tenant.users.lastName}</h3>
                  <p className="text-gray-400 text-sm mb-1">{tenant.users.email}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-300 mb-4">
                    <span>Unit <span className="text-white font-medium">{tenant.units.unitNumber}</span></span>
                    <span className="text-gray-500">|</span>
                    <span className="text-gray-400">{tenant.units.properties.name}</span>
                  </div>
                  <p className="text-purple-300 font-semibold mb-4">{formatCurrency(tenant.rentAmount)}/mo</p>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleAddWater(tenant)}
                      className="flex flex-col items-center gap-1 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                      title="Add Water Reading"
                    >
                      <Droplet className="h-5 w-5" />
                      <span className="text-xs font-medium">Water</span>
                    </button>
                    <button
                      onClick={() => handleAddGarbageFee(tenant)}
                      className="flex flex-col items-center gap-1 p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md"
                      title="Edit Garbage Fee"
                    >
                      <Trash2 className="h-5 w-5" />
                      <span className="text-xs font-medium">Garbage</span>
                    </button>
                    <button
                      onClick={() => handleViewDetails(tenant)}
                      className="flex flex-col items-center gap-1 p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-md"
                      title="View Details"
                    >
                      <History className="h-5 w-5" />
                      <span className="text-xs font-medium">Details</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredTenants.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-400">
              {search ? "No tenants found matching your search" : "No active tenants"}
            </div>
          )}
        </div>
      </div>

      {/* ===================== WATER MODAL ===================== */}
      {showWaterModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-gray-900 border border-blue-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Droplet className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Add Water Reading</h3>
                  <p className="text-gray-400 text-sm">{selectedTenant.users.firstName} {selectedTenant.users.lastName} - Unit {selectedTenant.units.unitNumber}</p>
                </div>
              </div>
              <button onClick={() => setShowWaterModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            {showDuplicateWarning && existingReading && (
              <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm font-semibold mb-2">
                  ⚠️ Reading already exists for {new Date(0, waterData.month - 1).toLocaleString("default", { month: "long" })} {waterData.year}
                </p>
                <div className="text-xs text-gray-400 mb-3">
                  <span>Existing: {existingReading.previousReading} → {existingReading.currentReading} ({existingReading.unitsConsumed} units) = KSh {existingReading.amountDue?.toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setWaterData((prev: any) => ({
                        ...prev,
                        previousReading: existingReading.previousReading.toString(),
                        currentReading: existingReading.currentReading.toString(),
                        canEditPrevious: true,
                      }));
                      setShowDuplicateWarning(false);
                    }}
                    className="flex-1 px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs hover:bg-yellow-500/30"
                  >
                    ✏️ Edit Existing
                  </button>
                  <button
                    onClick={() => setShowDuplicateWarning(false)}
                    className="flex-1 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600"
                  >
                    Continue Anyway
                  </button>
                </div>
              </div>
            )}
            {/* Cascading Info Banner */}
            <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm font-semibold mb-1">
                📋 Recording: {new Date(0, waterData.month - 1).toLocaleString("default", { month: "long" })} {waterData.year}
              </p>
              {waterData.missingMonths?.length > 1 ? (
                <>
                  <p className="text-orange-300 text-xs mt-1">
                    ⚠️ {waterData.missingMonths.length} months missing. Must record in order — starting from earliest.
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Remaining after this: {waterData.missingMonths.slice(1,4).map((m: any) => new Date(0, m.month - 1).toLocaleString("default", { month: "short" }) + " " + m.year).join(", ")}
                    {waterData.missingMonths.length > 4 ? ` +${waterData.missingMonths.length - 4} more` : ""}
                  </p>
                </>
              ) : waterData.missingMonths?.length === 1 ? (
                <p className="text-yellow-300 text-xs mt-1">⚠️ This is the only missing month.</p>
              ) : (
                <p className="text-green-300 text-xs mt-1">✅ All previous months are recorded. Recording current month.</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Month</label>
                  <select
                    value={waterData.month}
                    onChange={(e) => setWaterData((prev: any) => ({ ...prev, month: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString("default", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
                  <select
                    value={waterData.year}
                    onChange={(e) => setWaterData((prev: any) => ({ ...prev, year: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Previous Reading</label>
                <input
                  type="number"
                  value={waterData.previousReading}
                  onChange={(e) => setWaterData((prev: any) => ({ ...prev, previousReading: e.target.value }))}
                  disabled={!waterData.canEditPrevious}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-50"
                  placeholder="Previous meter reading"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Current Reading</label>
                <input
                  type="number"
                  value={waterData.currentReading}
                  onChange={(e) => setWaterData((prev: any) => ({ ...prev, currentReading: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="Current meter reading"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Rate per Unit (KSh)</label>
                <input
                  type="number"
                  value={waterData.ratePerUnit}
                  onChange={(e) => setWaterData((prev: any) => ({ ...prev, ratePerUnit: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>

              {waterData.previousReading && waterData.currentReading && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Units Consumed:</span>
                    <span className="text-white font-semibold">
                      {Math.max(0, parseFloat(waterData.currentReading) - parseFloat(waterData.previousReading)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Amount Due:</span>
                    <span className="text-blue-400 font-bold text-lg">
                      KSh {(Math.max(0, parseFloat(waterData.currentReading) - parseFloat(waterData.previousReading)) * parseFloat(waterData.ratePerUnit || "0")).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowWaterModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWaterSubmit}
                  disabled={submitting || !waterData.currentReading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Reading"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== GARBAGE MODAL ===================== */}
      {showGarbageModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-gray-900 border border-green-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Trash2 className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Edit Garbage Fee</h3>
                  <p className="text-gray-400 text-sm">{selectedTenant.users.firstName} {selectedTenant.users.lastName} - Unit {selectedTenant.units.unitNumber}</p>
                </div>
              </div>
              <button onClick={() => setShowGarbageModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm">💡 Garbage fees auto-generate when viewing tenant details. Use this to edit or override a specific month.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Month</label>
                  <select
                    value={garbageData.month}
                    onChange={(e) => setGarbageData((prev: any) => ({ ...prev, month: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString("default", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
                  <select
                    value={garbageData.year}
                    onChange={(e) => setGarbageData((prev: any) => ({ ...prev, year: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount (KSh)</label>
                <input
                  type="number"
                  value={garbageData.amount}
                  onChange={(e) => setGarbageData((prev: any) => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="e.g. 500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowGarbageModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGarbageSubmit}
                  disabled={submitting || !garbageData.amount}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Fee"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== DETAILS MODAL ===================== */}
      {showDetailsModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl bg-gray-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <History className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Tenant Details & History</h3>
                  <p className="text-gray-400 text-sm">{selectedTenant.users.firstName} {selectedTenant.users.lastName}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Water History */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Droplet className="h-5 w-5 text-blue-400" />
                    Water Readings History
                  </h4>
                  <div className="space-y-3">
                    {waterHistory.length === 0 ? (
                      <p className="text-gray-400 text-sm">No water readings yet</p>
                    ) : (
                      waterHistory.map((reading: any) => (
                        <div key={reading.id} className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">
                              {new Date(0, reading.month - 1).toLocaleString("default", { month: "long" })} {reading.year}
                            </span>
                            <span className="text-blue-400 font-bold">KSh {reading.amountDue?.toLocaleString()}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                            <span>Previous: {reading.previousReading}</span>
                            <span>Current: {reading.currentReading}</span>
                            <span>Usage: {reading.unitsConsumed} units</span>
                            <span>Rate: KSh {reading.ratePerUnit}/unit</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Garbage History */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-green-400" />
                    Garbage Fees History
                  </h4>
                  <div className="space-y-3">
                    {garbageHistory.length === 0 ? (
                      <p className="text-gray-400 text-sm">No garbage fees yet</p>
                    ) : (
                      garbageHistory.map((fee: any) => {
                        const feeDate = new Date(fee.month);
                        return (
                          <div key={fee.id} className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium">
                                {feeDate.toLocaleString("default", { month: "long", year: "numeric" })}
                              </span>
                              <span className="text-green-400 font-bold">KSh {fee.amount?.toLocaleString()}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              fee.status === "PENDING"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-green-500/20 text-green-400"
                            }`}>
                              {fee.status}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== PROPERTY PRICING MODAL ===================== */}
      {showPropertyPricingModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-gray-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Settings className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Property Rates</h3>
              </div>
              <button onClick={() => { setShowPropertyPricingModal(false); setSelectedProperty(null); }} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            {!selectedProperty ? (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm mb-4">Select a property to update its rates:</p>
                {uniqueProperties.map((property) => (
                  <button
                    key={property.id}
                    onClick={() => setSelectedProperty(property)}
                    className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg text-left hover:border-purple-500/50 transition"
                  >
                    <p className="text-white font-medium">{property.name}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <p className="text-purple-300 font-medium">{selectedProperty.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Water Rate (KSh/unit)</label>
                  <input
                    type="number"
                    value={propertyPricing.waterRate}
                    onChange={(e) => setPropertyPricing({ ...propertyPricing, waterRate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Garbage Fee (KSh/month)</label>
                  <input
                    type="number"
                    value={propertyPricing.garbageFee}
                    onChange={(e) => setPropertyPricing({ ...propertyPricing, garbageFee: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 text-sm">💡 These rates will be suggested when recording readings for tenants in this property.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedProperty(null)}
                    className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSavePropertyRates}
                    disabled={submitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Save Rates"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
