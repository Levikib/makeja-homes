"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, X, Home, DollarSign, Building2, CheckCircle, Search, Filter } from "lucide-react";

interface Unit {
  id: string;
  unitNumber: string;
  rentAmount: number;
  depositAmount: number;
  status: string;
  type: string;
  properties: {
    id: string;
    name: string;
  };
}

interface CurrentUnit {
  unitNumber: string;
  rentAmount: number;
  depositAmount: number;
  properties: {
    name: string;
  };
}

interface SwitchUnitButtonProps {
  tenantId: string;
  currentUnit: CurrentUnit;
  tenantName: string;
}

export default function SwitchUnitButton({ tenantId, currentUnit, tenantName }: SwitchUnitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [vacantUnits, setVacantUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [keepDeposit, setKeepDeposit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [maxRent, setMaxRent] = useState("");

  const openModal = async () => {
    setIsOpen(true);
    setLoading(true);

    try {
      const response = await fetch("/api/units?status=VACANT");
      const data = await response.json();
      setVacantUnits(data.units || []);
    } catch (error) {
      console.error("Failed to fetch vacant units:", error);
      setNotification({ type: "error", message: "Failed to load vacant units" });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedUnit(null);
    setKeepDeposit(true);
    setNotification(null);
    setSearchTerm("");
    setPropertyFilter("");
    setMaxRent("");
  };

  // Get unique properties for filter
  const properties = useMemo(() => {
    const uniqueProps = Array.from(new Set(vacantUnits.map(u => u.properties.name)));
    return uniqueProps.map(name => ({
      id: vacantUnits.find(u => u.properties.name === name)?.properties.id || "",
      name,
    }));
  }, [vacantUnits]);

  // Filtered units based on search and filters
  const filteredUnits = useMemo(() => {
    return vacantUnits.filter(unit => {
      // Search filter
      const matchesSearch = !searchTerm || 
        unit.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.properties.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Property filter
      const matchesProperty = !propertyFilter || unit.properties.name === propertyFilter;

      // Rent filter
      const matchesRent = !maxRent || unit.rentAmount <= parseFloat(maxRent);

      return matchesSearch && matchesProperty && matchesRent;
    });
  }, [vacantUnits, searchTerm, propertyFilter, maxRent]);

  const handleSwitch = async () => {
    if (!selectedUnit) return;

    setSubmitting(true);

    try {
      const response = await fetch(`/api/tenants/${tenantId}/switch-unit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newUnitId: selectedUnit.id,
          keepDeposit,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to switch unit");
      }

      setNotification({ type: "success", message: "Unit switch initiated! Tenant will receive new lease agreement." });
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("Failed to switch unit:", error);
      setNotification({ type: "error", message: error.message });
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={openModal}
        className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
      >
        <ArrowRightLeft className="w-4 h-4 mr-2" />
        Switch Unit
      </Button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-orange-900/20 to-red-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <ArrowRightLeft className="w-6 h-6 text-orange-400" />
                    Switch Unit for {tenantName}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Move tenant from current unit to a new vacant unit
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Current Unit Info */}
              <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Current Unit</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Property</p>
                    <p className="text-white font-semibold">{currentUnit.properties.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Unit</p>
                    <p className="text-white font-semibold">{currentUnit.unitNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Rent</p>
                    <p className="text-green-400 font-semibold">KSH {currentUnit.rentAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Deposit Option */}
              <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepDeposit}
                    onChange={(e) => setKeepDeposit(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-white font-semibold">Keep Current Deposit</p>
                    <p className="text-gray-400 text-sm">
                      Transfer KSH {currentUnit.depositAmount.toLocaleString()} to new unit
                    </p>
                  </div>
                </label>
              </div>

              {/* Filters Section */}
              <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-white">Filter Units</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search unit number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* Property Filter */}
                  <select
                    value={propertyFilter}
                    onChange={(e) => setPropertyFilter(e.target.value)}
                    className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">All Properties</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.name}>
                        {prop.name}
                      </option>
                    ))}
                  </select>

                  {/* Max Rent Filter */}
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      placeholder="Max rent..."
                      value={maxRent}
                      onChange={(e) => setMaxRent(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Results count */}
                <p className="text-gray-400 text-sm mt-3">
                  Showing {filteredUnits.length} of {vacantUnits.length} vacant units
                </p>
              </div>

              {/* Available Units */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Select New Unit
                </h3>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-gray-600 border-t-orange-500 rounded-full animate-spin"></div>
                    <p className="text-gray-400 mt-4">Loading vacant units...</p>
                  </div>
                ) : filteredUnits.length === 0 ? (
                  <div className="text-center py-12">
                    <Home className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">
                      {vacantUnits.length === 0 
                        ? "No vacant units available" 
                        : "No units match your filters"}
                    </p>
                    {vacantUnits.length > 0 && (
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setPropertyFilter("");
                          setMaxRent("");
                        }}
                        className="mt-4 text-orange-400 hover:text-orange-300"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUnits.map((unit) => (
                      <div
                        key={unit.id}
                        onClick={() => setSelectedUnit(unit)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedUnit?.id === unit.id
                            ? "border-orange-500 bg-orange-900/20"
                            : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                        }`}
                      >
                        {selectedUnit?.id === unit.id && (
                          <div className="flex justify-end mb-2">
                            <CheckCircle className="w-5 h-5 text-orange-400" />
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <p className="text-white font-semibold text-sm">{unit.properties.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-gray-400" />
                            <p className="text-white font-bold">Unit {unit.unitNumber}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            <p className="text-green-400 font-semibold">KSH {unit.rentAmount.toLocaleString()}</p>
                          </div>
                          <p className="text-gray-400 text-xs">{unit.type.replace(/_/g, ' ')}</p>
                          {!keepDeposit && (
                            <p className="text-gray-400 text-xs">
                              Deposit: KSH {unit.depositAmount.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notification */}
              {notification && (
                <div
                  className={`mt-6 p-4 rounded-lg border ${
                    notification.type === "success"
                      ? "bg-green-900/20 border-green-700/30 text-green-400"
                      : "bg-red-900/20 border-red-700/30 text-red-400"
                  }`}
                >
                  {notification.message}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-700 bg-gray-800/50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  {selectedUnit ? (
                    <p>
                      Moving to <span className="text-white font-semibold">{selectedUnit.properties.name} - Unit {selectedUnit.unitNumber}</span>
                    </p>
                  ) : (
                    <p>Select a unit to continue</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={closeModal}
                    variant="outline"
                    className="border-gray-700"
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSwitch}
                    disabled={!selectedUnit || submitting}
                    className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="w-4 h-4 mr-2" />
                        Confirm Switch
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
