"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2, Home, User, DollarSign, Loader2, TrendingDown, AlertTriangle, Plus, X } from "lucide-react";

interface Property {
  id: string;
  name: string;
  location: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  status: string;
  propertyId: string;
  properties: {
    id: string;
    name: string;
  };
  tenant: {
    id: string;
    depositAmount: number;
    leaseEndDate: Date;
    users: {
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
}

interface Damage {
  id: string;
  description: string;
  amount: number;
}

interface RefundDepositClientProps {
  properties: Property[];
  units: Unit[];
  preSelected: Unit | null;
}

export default function RefundDepositClient({ properties, units, preSelected }: RefundDepositClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [selectedPropertyId, setSelectedPropertyId] = useState(preSelected?.propertyId || "");
  const [selectedUnitId, setSelectedUnitId] = useState(preSelected?.id || "");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(preSelected);

  // Refund details
  const [refundDate, setRefundDate] = useState(new Date().toISOString().split("T")[0]);
  const [refundMethod, setRefundMethod] = useState("Bank Transfer");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Damages
  const [damages, setDamages] = useState<Damage[]>([]);

  // Initialize with preSelected
  useEffect(() => {
    if (preSelected) {
      setSelectedPropertyId(preSelected.propertyId);
      setSelectedUnitId(preSelected.id);
      setSelectedUnit(preSelected);
    }
  }, [preSelected]);

  // Calculate totals
  const depositAmount = selectedUnit?.tenant?.depositAmount || 0;
  const totalDamages = damages.reduce((sum, d) => sum + d.amount, 0);
  const refundAmount = depositAmount - totalDamages;

  // Filter units by selected property
  const filteredUnits = useMemo(() => {
    if (!selectedPropertyId) return [];
    return units.filter((unit) => unit.propertyId === selectedPropertyId);
  }, [selectedPropertyId, units]);

  // Handle property selection
  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedUnitId("");
    setSelectedUnit(null);
    setDamages([]);
  };

  // Handle unit selection
  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    const unit = units.find((u) => u.id === unitId);
    setSelectedUnit(unit || null);
    setDamages([]);
  };

  // Add damage
  const addDamage = () => {
    setDamages([...damages, {
      id: Date.now().toString(),
      description: "",
      amount: 0,
    }]);
  };

  // Update damage
  const updateDamage = (id: string, field: keyof Damage, value: string | number) => {
    setDamages(damages.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  // Remove damage
  const removeDamage = (id: string) => {
    setDamages(damages.filter(d => d.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUnit || !selectedUnit.tenant) {
      alert("Please select a tenant");
      return;
    }

    if (refundAmount < 0) {
      alert("Damages exceed deposit amount. Please adjust damages.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/deposits/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedUnit.tenant.id,
          depositAmount,
          damages: damages.filter(d => d.description && d.amount > 0),
          totalDamages,
          refundAmount,
          refundDate,
          refundMethod,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        router.push("/dashboard/admin/deposits");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to process refund");
      }
    } catch (error) {
      console.error("Error processing refund:", error);
      alert("Failed to process refund");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cascading Selection Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-purple-400" />
          Select Tenant (Expired Leases Only)
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
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
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
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
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
              {selectedUnit?.tenant ? (
                <span className="text-white font-semibold">
                  {selectedUnit.tenant.users.firstName} {selectedUnit.tenant.users.lastName}
                </span>
              ) : (
                <span>Select unit to see tenant</span>
              )}
            </div>
          </div>
        </div>

        {/* Tenant Info Display */}
        {selectedUnit?.tenant && (
          <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Tenant Name</p>
                <p className="text-white font-semibold">
                  {selectedUnit.tenant.users.firstName} {selectedUnit.tenant.users.lastName}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Email</p>
                <p className="text-white">{selectedUnit.tenant.users.email}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Lease Ended</p>
                <p className="text-red-400 font-semibold">
                  {new Date(selectedUnit.tenant.leaseEndDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deposit Breakdown Section */}
      {selectedUnit?.tenant && (
        <>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Damage Deductions
            </h2>

            {damages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No damages recorded</p>
                <Button type="button" onClick={addDamage} variant="outline" className="border-yellow-600 text-yellow-400">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Damage
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {damages.map((damage) => (
                  <div key={damage.id} className="flex gap-3 items-start bg-gray-900/50 p-4 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={damage.description}
                        onChange={(e) => updateDamage(damage.id, "description", e.target.value)}
                        placeholder="Damage description (e.g., Broken window)"
                        required
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 mb-2"
                      />
                      <input
                        type="number"
                        value={damage.amount || ""}
                        onChange={(e) => updateDamage(damage.id, "amount", parseFloat(e.target.value) || 0)}
                        placeholder="Amount (KSH)"
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>
                    <Button type="button" onClick={() => removeDamage(damage.id)} variant="ghost" className="text-red-400 hover:text-red-300">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" onClick={addDamage} variant="outline" className="w-full border-yellow-600 text-yellow-400">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Damage
                </Button>
              </div>
            )}
          </div>

          {/* Calculation Summary */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-400" />
              Refund Calculation
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-400">Original Deposit:</span>
                <span className="text-white font-bold">KSH {depositAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-400">Total Damages:</span>
                <span className="text-red-400 font-bold">- KSH {totalDamages.toLocaleString()}</span>
              </div>
              <div className="border-t border-purple-500/30 pt-3 flex justify-between items-center text-2xl">
                <span className="text-gray-300 font-semibold">Refund Amount:</span>
                <span className={`font-bold ${refundAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  KSH {refundAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Refund Details Section */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-green-400" />
              Refund Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Refund Date *
                </label>
                <input
                  type="date"
                  value={refundDate}
                  onChange={(e) => setRefundDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Refund Method *
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="MPesa">M-Pesa</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
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
                  placeholder="e.g., Transaction ID"
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
                placeholder="Additional notes about the refund..."
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/admin/deposits")}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || refundAmount < 0}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Refund...
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Process Refund (KSH {refundAmount.toLocaleString()})
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
