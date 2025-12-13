"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2, Home, User, Calendar, DollarSign, FileText, Loader2 } from "lucide-react";

interface Property {
  id: string;
  name: string;
  location: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  rentAmount: number;
  depositAmount: number | null;
  propertyId: string;
  properties: {
    id: string;
    name: string;
  };
  tenants: Array<{
    id: string;
    rentAmount: number;
    depositAmount: number;
    leaseStartDate: Date;
    leaseEndDate: Date;
    users: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
}

interface NewLeaseClientProps {
  properties: Property[];
  units: Unit[];
}

export default function NewLeaseClient({ properties, units }: NewLeaseClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Unit["tenants"][0] | null>(null);

  // Lease details
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("1");
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState("5");
  const [lateFeeAmount, setLateFeeAmount] = useState("");
  const [terms, setTerms] = useState("");

  // Filter units by selected property
  const filteredUnits = useMemo(() => {
    if (!selectedPropertyId) return [];
    return units.filter((unit) => unit.propertyId === selectedPropertyId);
  }, [selectedPropertyId, units]);

  // Handle property selection
  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedUnitId(""); // Reset unit selection
    setSelectedTenant(null); // Reset tenant
    resetFinancialFields();
  };

  // Handle unit selection - FIX: Use unit rent when tenant rent is 0
  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    
    const unit = units.find((u) => u.id === unitId);
    
    if (unit && unit.tenants && unit.tenants.length > 0) {
      // Get the first tenant (should only be one per unit)
      const tenant = unit.tenants[0];
      setSelectedTenant(tenant);
      
      // FIX: Use unit's rent amount if tenant's rent is 0
      const rentAmount = tenant.rentAmount > 0 ? tenant.rentAmount : unit.rentAmount;
      const depositAmount = tenant.depositAmount > 0 
        ? tenant.depositAmount 
        : (unit.depositAmount || rentAmount * 2);
      
      // Auto-fill financial fields
      setMonthlyRent(rentAmount.toString());
      setSecurityDeposit(depositAmount.toString());
      
      // Auto-fill dates based on existing lease
      const existingEnd = new Date(tenant.leaseEndDate);
      const newStart = new Date(existingEnd);
      newStart.setDate(newStart.getDate() + 1); // Start day after current lease ends
      
      const newEnd = new Date(newStart);
      newEnd.setFullYear(newEnd.getFullYear() + 1); // 1 year lease
      
      setStartDate(newStart.toISOString().split("T")[0]);
      setEndDate(newEnd.toISOString().split("T")[0]);
    } else {
      setSelectedTenant(null);
      resetFinancialFields();
    }
  };

  const resetFinancialFields = () => {
    setMonthlyRent("");
    setSecurityDeposit("");
    setStartDate("");
    setEndDate("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTenant) {
      alert("Please select a tenant");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedTenant.id,
          startDate,
          endDate,
          monthlyRent: parseFloat(monthlyRent),
          securityDeposit: parseFloat(securityDeposit),
          paymentDueDay: parseInt(paymentDueDay),
          lateFeeGraceDays: parseInt(lateFeeGraceDays),
          lateFeeAmount: lateFeeAmount ? parseFloat(lateFeeAmount) : null,
          terms: terms || null,
          status: "ACTIVE",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/admin/leases/${data.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create lease");
      }
    } catch (error) {
      console.error("Error creating lease:", error);
      alert("Failed to create lease");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cascading Selection Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-400" />
          Select Tenant (Cascading)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Select Property */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Building2 className="w-4 h-4 inline mr-1" />
              1. Select Property
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => handlePropertyChange(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Choose a property...</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} - {property.location}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Home className="w-4 h-4 inline mr-1" />
              2. Select Unit
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => handleUnitChange(e.target.value)}
              disabled={!selectedPropertyId}
              required
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            >
              <option value="">
                {selectedPropertyId ? "Choose a unit..." : "Select property first"}
              </option>
              {filteredUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  Unit {unit.unitNumber}
                  {unit.tenants.length > 0 && ` - ${unit.tenants[0].users.firstName} ${unit.tenants[0].users.lastName}`}
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Tenant Auto-populates */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              3. Tenant (Auto)
            </label>
            <div className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-400 flex items-center justify-center h-[42px]">
              {selectedTenant ? (
                <span className="text-white font-semibold">
                  {selectedTenant.users.firstName} {selectedTenant.users.lastName}
                </span>
              ) : (
                <span>Select unit to see tenant</span>
              )}
            </div>
          </div>
        </div>

        {/* Tenant Info Display */}
        {selectedTenant && (
          <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Tenant Name</p>
                <p className="text-white font-semibold">
                  {selectedTenant.users.firstName} {selectedTenant.users.lastName}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Email</p>
                <p className="text-white">{selectedTenant.users.email}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Current Lease Ends</p>
                <p className="text-white">
                  {new Date(selectedTenant.leaseEndDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lease Period Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-400" />
          Lease Period
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              End Date *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Financial Terms Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-yellow-400" />
          Financial Terms
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Monthly Rent (KSH) *
            </label>
            <input
              type="number"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Security Deposit (KSH) *
            </label>
            <input
              type="number"
              value={securityDeposit}
              onChange={(e) => setSecurityDeposit(e.target.value)}
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Due Day (1-31) *
            </label>
            <input
              type="number"
              value={paymentDueDay}
              onChange={(e) => setPaymentDueDay(e.target.value)}
              required
              min="1"
              max="31"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Late Fee Grace Days *
            </label>
            <input
              type="number"
              value={lateFeeGraceDays}
              onChange={(e) => setLateFeeGraceDays(e.target.value)}
              required
              min="0"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Late Fee Amount (KSH)
            </label>
            <input
              type="number"
              value={lateFeeAmount}
              onChange={(e) => setLateFeeAmount(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Optional"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>
      </div>

      {/* Terms & Conditions Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-400" />
          Terms & Conditions
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Special Terms or Clauses
          </label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={6}
            placeholder="Enter any special terms, conditions, or clauses for this lease agreement..."
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/admin/leases")}
          className="border-gray-600 text-gray-300"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !selectedTenant}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Lease...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Create Lease Agreement
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
