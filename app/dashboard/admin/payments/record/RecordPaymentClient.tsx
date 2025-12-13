"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2, Home, User, DollarSign, Loader2, CreditCard, AlertCircle } from "lucide-react";

interface Property {
  id: string;
  name: string;
  location: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  rentAmount: number;
  status: string;
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

interface RecordPaymentClientProps {
  properties: Property[];
  units: Unit[];
}

export default function RecordPaymentClient({ properties, units }: RecordPaymentClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Payment details
  const [paymentType, setPaymentType] = useState("Rent");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");

  // Filter units by selected property
  const filteredUnits = useMemo(() => {
    if (!selectedPropertyId) return [];
    return units.filter((unit) => unit.propertyId === selectedPropertyId);
  }, [selectedPropertyId, units]);

  // Get available payment types based on unit status
  const availablePaymentTypes = useMemo(() => {
    if (!selectedUnit) return ["Rent", "Deposit", "Water", "Utilities", "Other"];
    
    if (selectedUnit.status === "VACANT") {
      // Vacant units: NO RENT, but can pay deposit, utilities, water
      return ["Deposit", "Water", "Utilities", "Other"];
    } else {
      // Occupied units: ALL payment types
      return ["Rent", "Deposit", "Water", "Utilities", "Other"];
    }
  }, [selectedUnit]);

  // Handle property selection
  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedUnitId("");
    setSelectedUnit(null);
    setAmount("");
    setPaymentType("Rent");
  };

  // Handle unit selection
  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    
    const unit = units.find((u) => u.id === unitId);
    
    if (unit) {
      setSelectedUnit(unit);
      
      // Auto-fill amount based on payment type and unit
      if (unit.tenant && unit.tenant.rentAmount > 0) {
        setAmount(unit.tenant.rentAmount.toString());
      } else {
        setAmount(unit.rentAmount.toString());
      }
      
      // If vacant, default to Deposit instead of Rent
      if (unit.status === "VACANT") {
        setPaymentType("Deposit");
      } else {
        setPaymentType("Rent");
      }
    } else {
      setSelectedUnit(null);
      setAmount("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUnit) {
      alert("Please select a unit");
      return;
    }

    // Validate: Can't record rent for vacant units
    if (selectedUnit.status === "VACANT" && paymentType === "Rent") {
      alert("Cannot record rent payment for vacant units. Please select Deposit, Water, or Utilities.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedUnit.tenant?.id || null,
          unitId: selectedUnit.id,
          amount: parseFloat(amount),
          paymentDate,
          paymentMethod,
          paymentType,
          referenceNumber: referenceNumber || null,
          transactionId: transactionId || null,
          periodStart: periodStart || null,
          periodEnd: periodEnd || null,
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
      {/* Unit Selection Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-400" />
          Select Unit (Cascading)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Select Property */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Building2 className="w-4 h-4 inline mr-1" />
              1. Select Property *
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
              2. Select Unit *
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
                  Unit {unit.unitNumber} - {unit.status}
                  {unit.tenant && ` (${unit.tenant.users.firstName} ${unit.tenant.users.lastName})`}
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Unit Status Display */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Home className="w-4 h-4 inline mr-1" />
              3. Status (Auto)
            </label>
            <div className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg flex items-center justify-center h-[42px]">
              {selectedUnit ? (
                <span className={`font-semibold ${selectedUnit.status === "OCCUPIED" ? "text-green-400" : "text-orange-400"}`}>
                  {selectedUnit.status}
                </span>
              ) : (
                <span className="text-gray-400">Select unit to see status</span>
              )}
            </div>
          </div>
        </div>

        {/* Unit/Tenant Info Display */}
        {selectedUnit && (
          <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Unit Status</p>
                <p className={`font-semibold ${selectedUnit.status === "OCCUPIED" ? "text-green-400" : "text-orange-400"}`}>
                  {selectedUnit.status}
                </p>
              </div>
              {selectedUnit.tenant ? (
                <>
                  <div>
                    <p className="text-gray-400 mb-1">Tenant</p>
                    <p className="text-white font-semibold">
                      {selectedUnit.tenant.users.firstName} {selectedUnit.tenant.users.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Email</p>
                    <p className="text-white">{selectedUnit.tenant.users.email}</p>
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <p className="text-gray-400 mb-1">Tenant</p>
                  <p className="text-orange-400">No tenant (Unit is vacant)</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vacant Unit Warning */}
        {selectedUnit && selectedUnit.status === "VACANT" && (
          <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-400 font-semibold text-sm">Vacant Unit - Limited Payment Types</p>
              <p className="text-orange-300 text-xs mt-1">
                You can record: Deposit, Water, Utilities. Rent payments are not allowed for vacant units.
              </p>
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
              Payment Type *
            </label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500"
            >
              {availablePaymentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

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
              placeholder="e.g., 15000"
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
              <option value="Cash">Cash</option>
              <option value="MPesa">M-Pesa</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
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
              Reference Number
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g., INV-2025-001"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Transaction ID
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g., MPesa ID, Bank Ref"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Period Start
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Period End
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional payment notes..."
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
          disabled={isLoading || !selectedUnit}
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
