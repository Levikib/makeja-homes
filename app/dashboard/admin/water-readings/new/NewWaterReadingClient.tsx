"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2, Home, Calendar, Droplets, Loader2, DollarSign } from "lucide-react";

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
  lastReading: number;
}

interface NewWaterReadingClientProps {
  properties: Property[];
  units: Unit[];
}

export default function NewWaterReadingClient({ properties, units }: NewWaterReadingClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Reading details
  const [readingDate, setReadingDate] = useState(new Date().toISOString().split("T")[0]);
  const [previousReading, setPreviousReading] = useState("");
  const [currentReading, setCurrentReading] = useState("");
  const [ratePerUnit, setRatePerUnit] = useState("5"); // Default KSH 5 per unit
  const [notes, setNotes] = useState("");

  // Calculate consumption and cost
  const consumption = currentReading && previousReading 
    ? parseFloat(currentReading) - parseFloat(previousReading) 
    : 0;
  const totalCost = consumption * parseFloat(ratePerUnit || "0");

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
    setPreviousReading("");
    setCurrentReading("");
  };

  // Handle unit selection
  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    
    const unit = units.find((u) => u.id === unitId);
    if (unit) {
      setSelectedUnit(unit);
      setPreviousReading(unit.lastReading.toString());
    } else {
      setSelectedUnit(null);
      setPreviousReading("");
    }
    setCurrentReading("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUnit) {
      alert("Please select a unit");
      return;
    }

    if (parseFloat(currentReading) < parseFloat(previousReading)) {
      alert("Current reading cannot be less than previous reading");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/water-readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: selectedUnit.id,
          readingDate,
          previousReading: parseFloat(previousReading),
          currentReading: parseFloat(currentReading),
          ratePerUnit: parseFloat(ratePerUnit),
          notes: notes || null,
        }),
      });

      if (response.ok) {
        router.push("/dashboard/admin/water-readings");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to record water reading");
      }
    } catch (error) {
      console.error("Error recording water reading:", error);
      alert("Failed to record water reading");
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
          Select Unit (Cascading)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Unit Info Display */}
        {selectedUnit && (
          <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Property</p>
                <p className="text-white font-semibold">{selectedUnit.properties.name}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Unit Status</p>
                <p className={`font-semibold ${selectedUnit.status === "OCCUPIED" ? "text-green-400" : "text-orange-400"}`}>
                  {selectedUnit.status}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Last Reading</p>
                <p className="text-cyan-400 font-bold text-lg">{selectedUnit.lastReading} units</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reading Details Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-400" />
          Reading Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reading Date *
            </label>
            <input
              type="date"
              value={readingDate}
              onChange={(e) => setReadingDate(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rate Per Unit (KSH) *
            </label>
            <input
              type="number"
              value={ratePerUnit}
              onChange={(e) => setRatePerUnit(e.target.value)}
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Previous Reading *
            </label>
            <input
              type="number"
              value={previousReading}
              onChange={(e) => setPreviousReading(e.target.value)}
              required
              min="0"
              step="0.01"
              disabled={!selectedUnit}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Reading *
            </label>
            <input
              type="number"
              value={currentReading}
              onChange={(e) => setCurrentReading(e.target.value)}
              required
              min="0"
              step="0.01"
              disabled={!selectedUnit}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Calculation Display */}
        {consumption > 0 && (
          <div className="mt-4 p-4 bg-gradient-to-r from-cyan-500/10 to-green-500/10 border border-cyan-500/30 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Consumption</p>
                <p className="text-cyan-400 font-bold text-2xl">{consumption} units</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Rate Per Unit</p>
                <p className="text-white font-semibold text-lg">KSH {parseFloat(ratePerUnit).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Cost</p>
                <p className="text-green-400 font-bold text-2xl">KSH {totalCost.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any additional notes..."
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/admin/water-readings")}
          className="border-gray-600 text-gray-300"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !selectedUnit || !currentReading}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Recording...
            </>
          ) : (
            <>
              <Droplets className="w-4 h-4 mr-2" />
              Record Reading
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
