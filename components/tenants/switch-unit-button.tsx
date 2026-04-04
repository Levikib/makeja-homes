"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRightLeft, X, Home, DollarSign, Building2,
  CheckCircle, Search, Filter, Calendar, StickyNote,
  TrendingUp, TrendingDown, Minus, AlertCircle, ChevronRight,
} from "lucide-react";

interface Unit {
  id: string;
  unitNumber: string;
  rentAmount: number;
  depositAmount: number;
  propertyId: string;
  propertyName: string;
  bedrooms?: number;
  type?: string;
}

interface TransferData {
  tenant: { id: string; name: string; email: string };
  currentUnit: { id: string; unitNumber: string; propertyName: string; rentAmount: number };
  currentLease: { id: string; endDate: string; depositAmount: number } | null;
  vacantUnits: Unit[];
}

interface SwitchUnitButtonProps {
  tenantId: string;
  tenantName: string;
}

type Step = "select" | "configure" | "confirm";

export default function SwitchUnitButton({ tenantId, tenantName }: SwitchUnitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [keepDeposit, setKeepDeposit] = useState(true);
  const [rentOverride, setRentOverride] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [maxRent, setMaxRent] = useState("");

  const openModal = async () => {
    setIsOpen(true);
    setLoading(true);
    setStep("select");
    setSelectedUnit(null);
    setNotification(null);
    setRentOverride("");
    setNotes("");
    setEffectiveDate(new Date().toISOString().split("T")[0]);

    try {
      const response = await fetch(`/api/tenants/${tenantId}/switch-unit`);
      if (!response.ok) throw new Error("Failed to load transfer data");
      const data: TransferData = await response.json();
      setTransferData(data);
    } catch (error) {
      setNotification({ type: "error", message: "Failed to load transfer data" });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedUnit(null);
    setKeepDeposit(true);
    setRentOverride("");
    setNotes("");
    setEffectiveDate("");
    setNotification(null);
    setSearchTerm("");
    setPropertyFilter("");
    setMaxRent("");
    setStep("select");
    setTransferData(null);
  };

  const vacantUnits = transferData?.vacantUnits ?? [];
  const currentUnit = transferData?.currentUnit;
  const currentLease = transferData?.currentLease;

  // Unique properties for filter
  const properties = useMemo(() => {
    const seen = new Set<string>();
    return vacantUnits.filter(u => {
      if (seen.has(u.propertyName)) return false;
      seen.add(u.propertyName);
      return true;
    }).map(u => ({ id: u.propertyId, name: u.propertyName }));
  }, [vacantUnits]);

  // Filtered units
  const filteredUnits = useMemo(() => {
    return vacantUnits.filter(unit => {
      const matchesSearch = !searchTerm ||
        unit.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.propertyName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProperty = !propertyFilter || unit.propertyName === propertyFilter;
      const matchesRent = !maxRent || unit.rentAmount <= parseFloat(maxRent);
      return matchesSearch && matchesProperty && matchesRent;
    });
  }, [vacantUnits, searchTerm, propertyFilter, maxRent]);

  const effectiveRent = rentOverride ? Number(rentOverride) : (selectedUnit?.rentAmount ?? 0);
  const rentDiff = currentUnit ? effectiveRent - currentUnit.rentAmount : 0;
  const depositForNewLease = keepDeposit
    ? (currentLease?.depositAmount ?? 0)
    : (selectedUnit?.depositAmount ?? 0);

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
          effectiveDate: effectiveDate || undefined,
          rentOverride: rentOverride ? Number(rentOverride) : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to switch unit");
      }
      setNotification({ type: "success", message: `Unit switch complete! ${tenantName} will receive a new lease agreement by email.` });
      setTimeout(() => { window.location.reload(); }, 2500);
    } catch (error: any) {
      setNotification({ type: "error", message: error.message });
      setSubmitting(false);
    }
  };

  const RentBadge = () => {
    if (rentDiff === 0) return <span className="flex items-center gap-1 text-gray-400 text-xs"><Minus className="w-3 h-3" /> Same rent</span>;
    if (rentDiff > 0) return <span className="flex items-center gap-1 text-red-400 text-xs"><TrendingUp className="w-3 h-3" /> +KSH {rentDiff.toLocaleString()}/mo</span>;
    return <span className="flex items-center gap-1 text-green-400 text-xs"><TrendingDown className="w-3 h-3" /> KSH {Math.abs(rentDiff).toLocaleString()}/mo savings</span>;
  };

  const stepTitles: Record<Step, string> = {
    select: "Select New Unit",
    configure: "Configure Transfer",
    confirm: "Confirm Transfer",
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

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-orange-900/30 to-red-900/30 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-orange-400" />
                    Unit Transfer — {tenantName}
                  </h2>
                  <p className="text-gray-400 text-sm mt-0.5">{stepTitles[step]}</p>
                </div>
                <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mt-4">
                {(["select", "configure", "confirm"] as Step[]).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s ? "bg-orange-500 text-white" :
                      (step === "configure" && i === 0) || (step === "confirm" && i < 2)
                        ? "bg-green-600 text-white" : "bg-gray-700 text-gray-400"
                    }`}>{i + 1}</div>
                    <span className={`text-xs hidden sm:block ${step === s ? "text-white" : "text-gray-500"}`}>
                      {s === "select" ? "Select Unit" : s === "configure" ? "Configure" : "Confirm"}
                    </span>
                    {i < 2 && <ChevronRight className="w-3 h-3 text-gray-600" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Current unit summary bar */}
            {currentUnit && (
              <div className="px-6 py-3 bg-gray-800/60 border-b border-gray-700/50 flex-shrink-0">
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-400">Current:</span>
                  <span className="text-white font-medium">{currentUnit.propertyName} — Unit {currentUnit.unitNumber}</span>
                  <span className="text-green-400 font-semibold">KSH {currentUnit.rentAmount.toLocaleString()}/mo</span>
                  {currentLease && (
                    <span className="text-gray-400 text-xs">
                      Lease ends {new Date(currentLease.endDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-gray-700 border-t-orange-500 rounded-full animate-spin"></div>
                  <p className="text-gray-400 mt-4">Loading transfer data...</p>
                </div>
              ) : notification?.type === "success" ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Transfer Complete!</h3>
                  <p className="text-gray-400">{notification.message}</p>
                  <p className="text-gray-500 text-sm mt-2">Refreshing page...</p>
                </div>
              ) : (
                <>
                  {/* STEP 1: Select Unit */}
                  {step === "select" && (
                    <div className="space-y-5">
                      {/* Filters */}
                      <div className="p-4 bg-gray-800/50 border border-gray-700/50 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <Filter className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-300">Filter Vacant Units</span>
                          <span className="ml-auto text-xs text-gray-500">{filteredUnits.length} of {vacantUnits.length} available</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                            <input
                              type="text"
                              placeholder="Search unit..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-600 focus:border-orange-500 focus:outline-none"
                            />
                          </div>
                          <select
                            value={propertyFilter}
                            onChange={(e) => setPropertyFilter(e.target.value)}
                            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none"
                          >
                            <option value="">All Properties</option>
                            {properties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                            <input
                              type="number"
                              placeholder="Max rent..."
                              value={maxRent}
                              onChange={(e) => setMaxRent(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-600 focus:border-orange-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Unit grid */}
                      {filteredUnits.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Home className="w-12 h-12 text-gray-700 mb-3" />
                          <p className="text-gray-400 font-medium">
                            {vacantUnits.length === 0 ? "No vacant units available" : "No units match your filters"}
                          </p>
                          {vacantUnits.length > 0 && (
                            <button
                              onClick={() => { setSearchTerm(""); setPropertyFilter(""); setMaxRent(""); }}
                              className="mt-3 text-orange-400 hover:text-orange-300 text-sm"
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {filteredUnits.map(unit => {
                            const diff = currentUnit ? unit.rentAmount - currentUnit.rentAmount : 0;
                            const isSelected = selectedUnit?.id === unit.id;
                            return (
                              <div
                                key={unit.id}
                                onClick={() => setSelectedUnit(unit)}
                                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-orange-500 bg-orange-950/40 shadow-lg shadow-orange-900/20"
                                    : "border-gray-700 bg-gray-800/40 hover:border-gray-500 hover:bg-gray-800/70"
                                }`}
                              >
                                {isSelected && (
                                  <div className="absolute top-3 right-3">
                                    <CheckCircle className="w-5 h-5 text-orange-400" />
                                  </div>
                                )}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                    <p className="text-gray-300 text-xs font-medium truncate">{unit.propertyName}</p>
                                  </div>
                                  <p className="text-white font-bold text-lg">Unit {unit.unitNumber}</p>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-green-400 font-semibold">KSH {unit.rentAmount.toLocaleString()}</span>
                                    <span className="text-gray-500 text-xs">/mo</span>
                                  </div>
                                  {currentUnit && (
                                    <div className={`text-xs font-medium ${diff > 0 ? "text-red-400" : diff < 0 ? "text-green-400" : "text-gray-500"}`}>
                                      {diff > 0 ? `+${diff.toLocaleString()}` : diff < 0 ? `${diff.toLocaleString()}` : "Same rent"}
                                    </div>
                                  )}
                                  {unit.type && (
                                    <p className="text-gray-500 text-xs">{unit.type.replace(/_/g, " ")}</p>
                                  )}
                                  {unit.bedrooms != null && (
                                    <p className="text-gray-500 text-xs">{unit.bedrooms} bed{unit.bedrooms !== 1 ? "s" : ""}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 2: Configure */}
                  {step === "configure" && selectedUnit && (
                    <div className="space-y-5 max-w-2xl mx-auto">
                      {/* Selected unit recap */}
                      <div className="p-4 bg-orange-950/30 border border-orange-700/40 rounded-xl">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-orange-300 text-xs font-medium mb-1">Moving to</p>
                            <p className="text-white font-bold text-lg">{selectedUnit.propertyName} — Unit {selectedUnit.unitNumber}</p>
                            <p className="text-green-400 font-semibold mt-1">KSH {selectedUnit.rentAmount.toLocaleString()}/mo</p>
                          </div>
                          <button onClick={() => setStep("select")} className="text-gray-500 hover:text-gray-300 text-xs underline">
                            Change unit
                          </button>
                        </div>
                      </div>

                      {/* Effective date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <Calendar className="w-4 h-4 inline mr-1.5 text-gray-400" />
                          Effective Date
                        </label>
                        <input
                          type="date"
                          value={effectiveDate}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                        />
                        <p className="text-gray-500 text-xs mt-1">New lease will start from this date (1-year term)</p>
                      </div>

                      {/* Rent override */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <DollarSign className="w-4 h-4 inline mr-1.5 text-gray-400" />
                          Monthly Rent Override <span className="text-gray-500 font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">KSH</span>
                          <input
                            type="number"
                            placeholder={selectedUnit.rentAmount.toLocaleString()}
                            value={rentOverride}
                            onChange={(e) => setRentOverride(e.target.value)}
                            className="w-full pl-12 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                        <p className="text-gray-500 text-xs mt-1">
                          Defaults to KSH {selectedUnit.rentAmount.toLocaleString()} — override only if negotiated rent differs
                        </p>
                      </div>

                      {/* Deposit handling */}
                      <div className="p-4 bg-gray-800/50 border border-gray-700/50 rounded-xl space-y-3">
                        <p className="text-sm font-medium text-gray-300">Security Deposit</p>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <div
                            onClick={() => setKeepDeposit(true)}
                            className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${keepDeposit ? "border-orange-500 bg-orange-500" : "border-gray-600"}`}
                          >
                            {keepDeposit && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">Transfer existing deposit</p>
                            <p className="text-gray-400 text-xs">
                              KSH {(currentLease?.depositAmount ?? 0).toLocaleString()} carried forward from current unit
                            </p>
                          </div>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <div
                            onClick={() => setKeepDeposit(false)}
                            className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${!keepDeposit ? "border-orange-500 bg-orange-500" : "border-gray-600"}`}
                          >
                            {!keepDeposit && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">Require new deposit</p>
                            <p className="text-gray-400 text-xs">
                              KSH {selectedUnit.depositAmount.toLocaleString()} — standard deposit for new unit
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <StickyNote className="w-4 h-4 inline mr-1.5 text-gray-400" />
                          Transfer Notes <span className="text-gray-500 font-normal">(optional)</span>
                        </label>
                        <textarea
                          placeholder="Reason for transfer, special conditions, etc."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          maxLength={500}
                          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-600 focus:border-orange-500 focus:outline-none resize-none text-sm"
                        />
                        <p className="text-gray-600 text-xs mt-1 text-right">{notes.length}/500</p>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Confirm */}
                  {step === "confirm" && selectedUnit && currentUnit && (
                    <div className="space-y-5 max-w-2xl mx-auto">
                      <div className="p-5 bg-gray-800/50 border border-gray-700/50 rounded-xl">
                        <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Transfer Summary</h3>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* From */}
                          <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-700/50">
                            <p className="text-xs text-gray-500 mb-2">From</p>
                            <p className="text-white font-semibold">{currentUnit.propertyName}</p>
                            <p className="text-gray-300">Unit {currentUnit.unitNumber}</p>
                            <p className="text-green-400 font-semibold mt-1">KSH {currentUnit.rentAmount.toLocaleString()}/mo</p>
                          </div>
                          {/* To */}
                          <div className="p-3 bg-orange-950/40 rounded-lg border border-orange-700/40">
                            <p className="text-xs text-orange-400 mb-2">To</p>
                            <p className="text-white font-semibold">{selectedUnit.propertyName}</p>
                            <p className="text-gray-300">Unit {selectedUnit.unitNumber}</p>
                            <p className="text-green-400 font-semibold mt-1">KSH {effectiveRent.toLocaleString()}/mo</p>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between py-2 border-b border-gray-700/50">
                            <span className="text-gray-400">Rent change</span>
                            <RentBadge />
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-700/50">
                            <span className="text-gray-400">Security deposit</span>
                            <span className="text-white">
                              KSH {depositForNewLease.toLocaleString()}
                              <span className="text-gray-500 text-xs ml-1">({keepDeposit ? "transferred" : "new required"})</span>
                            </span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-700/50">
                            <span className="text-gray-400">Effective date</span>
                            <span className="text-white">{effectiveDate ? new Date(effectiveDate + "T12:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "Today"}</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-gray-400">Lease term</span>
                            <span className="text-white">1 year</span>
                          </div>
                          {notes && (
                            <div className="pt-2">
                              <span className="text-gray-400 text-xs block mb-1">Notes</span>
                              <p className="text-gray-300 text-sm bg-gray-900/40 p-2 rounded">{notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-amber-300 font-medium mb-1">What happens next</p>
                          <ul className="text-amber-100/70 space-y-1 text-xs">
                            <li>• Current lease will be terminated and old unit set to VACANT</li>
                            <li>• New unit is RESERVED — becomes OCCUPIED when lease is signed</li>
                            <li>• {tenantName} will receive a new lease agreement by email to sign</li>
                            <li>• This action cannot be undone without manual intervention</li>
                          </ul>
                        </div>
                      </div>

                      {notification?.type === "error" && (
                        <div className="p-3 bg-red-900/20 border border-red-700/40 rounded-lg text-red-400 text-sm">
                          {notification.message}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!notification?.type.includes("success") && !loading && (
              <div className="p-5 border-t border-gray-700 bg-gray-800/40 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    {step === "select" && !selectedUnit && <span>Select a vacant unit to continue</span>}
                    {step === "select" && selectedUnit && <span className="text-white">Selected: <strong>{selectedUnit.propertyName} — Unit {selectedUnit.unitNumber}</strong></span>}
                    {step === "configure" && <span className="text-gray-400 text-xs">Configure transfer details</span>}
                    {step === "confirm" && <span className="text-amber-400 text-xs">Review carefully before confirming</span>}
                  </div>
                  <div className="flex gap-3">
                    {step !== "select" && (
                      <Button
                        onClick={() => setStep(step === "confirm" ? "configure" : "select")}
                        variant="outline"
                        className="border-gray-600 text-gray-300"
                        disabled={submitting}
                      >
                        Back
                      </Button>
                    )}
                    <Button
                      onClick={closeModal}
                      variant="outline"
                      className="border-gray-700 text-gray-400"
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    {step === "select" && (
                      <Button
                        onClick={() => setStep("configure")}
                        disabled={!selectedUnit}
                        className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                      >
                        Next: Configure
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                    {step === "configure" && (
                      <Button
                        onClick={() => setStep("confirm")}
                        className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                      >
                        Review Transfer
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                    {step === "confirm" && (
                      <Button
                        onClick={handleSwitch}
                        disabled={submitting}
                        className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 min-w-[140px]"
                      >
                        {submitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            Confirm Transfer
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
