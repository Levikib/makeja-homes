"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2, Home, User, DollarSign, Loader2, CreditCard } from "lucide-react";

interface Property {
  id: string;
  name: string;
  location: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  rentAmount: number;
  propertyId: string;
  properties: {
    id: string;
    name: string;
  };
  tenant: {
    id: string;
    rentAmount: number;
    users: {
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
}

interface NewPaymentClientProps {
  properties: Property[];
  units: Unit[];
}

export default function NewPaymentClient({ properties, units }: NewPaymentClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Unit["tenant"]>(null);

  // Payment details
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("MPESA");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Debug on mount
  useEffect(() => {
    console.log("=== CLIENT DEBUG ===");
    console.log("Properties received:", properties.length);
    console.log("Units received:", units.length);
    console.log("Sample units:", units.slice(0, 3));
    console.log("===================");
  }, [properties, units]);

  // Filter units by selected property
  const filteredUnits = useMemo(() => {
    if (!selectedPropertyId) return [];
    const filtered = units.filter((unit) => unit.propertyId === selectedPropertyId);
    console.log("Filtered units for property", selectedPropertyId, ":", filtered.length);
    return filtered;
  }, [selectedPropertyId, units]);

  // Handle property selection
  const handlePropertyChange = (propertyId: string) => {
    console.log("Property selected:", propertyId);
    setSelectedPropertyId(propertyId);
    setSelectedUnitId("");
    setSelectedTenant(null);
    setAmount("");
  };

  // Handle unit selection
  const handleUnitChange = (unitId: string) => {
    console.log("Unit selected:", unitId);
    setSelectedUnitId(unitId);
    
    const unit = units.find((u) => u.id === unitId);
    console.log("Found unit:", unit);
    
    if (unit && unit.tenant) {
      console.log("Setting tenant:", unit.tenant);
      setSelectedTenant(unit.tenant);
      // Auto-fill amount with rent
      const rentAmount = unit.tenant.rentAmount > 0 ? unit.tenant.rentAmount : unit.rentAmount;
      setAmount(rentAmount.toString());
      console.log("Auto-filled amount:", rentAmount);
    } else {
      console.log("No tenant found for unit");
      setSelectedTenant(null);
      setAmount("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTenant) {
      alert("Please select a tenant");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedTenant.id,
          amount: parseFloat(amount),
          paymentDate,
          paymentMethod,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          status: "COMPLETED",
        }),
      });

      if (response.ok) {
        router.push("/dashboard/admin/payments");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to record payment");
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("Failed to record payment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Debug Info */}
      <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-4">
        <p className="text-purple-400 text-sm font-semibold mb-2">🐛 Client Debug Info</p>
        <div className="text-xs text-purple-200 space-y-1">
          <p>Properties in state: <strong>{properties.length}</strong></p>
          <p>Units in state: <strong>{units.length}</strong></p>
          <p>Filtered units: <strong>{filteredUnits.length}</strong></p>
          <p>Selected Property: <strong>{selectedPropertyId || "None"}</strong></p>
          <p>Selected Unit: <strong>{selectedUnitId || "None"}</strong></p>
          <p>Selected Tenant: <strong>{selectedTenant ? `${selectedTenant.users.firstName} ${selectedTenant.users.lastName}` : "None"}</strong></p>
          <p>Amount: <strong>{amount || "Not set"}</strong></p>
        </div>
      </div>

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
                  {unit.tenant && ` - ${unit.tenant.users.firstName} ${unit.tenant.users.lastName}`}
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
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
            </div>
          </div>
        )}
      </div>

      {/* Payment Details Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          Payment Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount (KSH) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Date *
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500"
            >
              <option value="MPESA">M-PESA</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reference Number
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g., MPESA code"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any additional notes about this payment..."
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/admin/payments")}
          className="border-gray-600 text-gray-300"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !selectedTenant}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Recording Payment...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Record Payment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
