"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Wrench, AlertTriangle, Info } from "lucide-react";

interface Me {
  id: string;
  role: string;
  firstName: string;
  lastName: string;
}

interface Property {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
}

interface NewMaintenanceClientProps {
  me: Me;
  properties: Property[];
  units: Unit[];
  tenantUnitId?: string | null;
}

const CATEGORIES = [
  { value: "PLUMBING", label: "Plumbing", icon: "🚰" },
  { value: "ELECTRICAL", label: "Electrical", icon: "⚡" },
  { value: "HVAC", label: "HVAC / AC", icon: "❄️" },
  { value: "APPLIANCE", label: "Appliance", icon: "🔌" },
  { value: "STRUCTURAL", label: "Structural", icon: "🏗️" },
  { value: "PAINTING", label: "Painting", icon: "🎨" },
  { value: "CLEANING", label: "Cleaning", icon: "🧹" },
  { value: "SECURITY", label: "Security", icon: "🔒" },
  { value: "OTHER", label: "Other", icon: "🔧" },
];

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "text-gray-400", bg: "bg-gray-800 border-gray-700", desc: "Not urgent, can wait" },
  { value: "MEDIUM", label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", desc: "Needs attention soon" },
  { value: "HIGH", label: "High", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", desc: "Urgent — within 24–48h" },
  { value: "EMERGENCY", label: "Emergency", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", desc: "Immediate danger / safety risk" },
];

const isTenant = (role: string) => role === "TENANT";
const canSetPriority = (role: string) => ["ADMIN", "MANAGER", "CARETAKER"].includes(role);
const canSetCost = (role: string) => ["ADMIN", "MANAGER"].includes(role);

export default function NewMaintenanceClient({ me, properties, units, tenantUnitId }: NewMaintenanceClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For tenants: use the resolved unitId from profile lookup
  const tenantUnit = useMemo(() => {
    if (!isTenant(me.role)) return null;
    if (tenantUnitId) return units.find(u => u.id === tenantUnitId) ?? null;
    return null;
  }, [me.role, tenantUnitId, units]);

  const [selectedPropertyId, setSelectedPropertyId] = useState(
    tenantUnit ? tenantUnit.propertyId : ""
  );
  const [selectedUnitId, setSelectedUnitId] = useState(
    tenantUnit ? tenantUnit.id : (tenantUnitId ?? "")
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("PLUMBING");
  const [priority, setPriority] = useState("MEDIUM");
  const [estimatedCost, setEstimatedCost] = useState("");

  const filteredUnits = useMemo(() => {
    if (!selectedPropertyId) return [];
    return units.filter(u => u.propertyId === selectedPropertyId);
  }, [selectedPropertyId, units]);

  const selectedUnit = units.find(u => u.id === selectedUnitId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUnitId) {
      alert("Please select a unit");
      return;
    }
    if (!title.trim() || !description.trim()) {
      alert("Title and description are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: selectedUnitId,
          title: title.trim(),
          description: description.trim(),
          category,
          priority: canSetPriority(me.role) ? priority : "MEDIUM",
          estimatedCost: canSetCost(me.role) && estimatedCost ? parseFloat(estimatedCost) : null,
        }),
      });

      if (res.ok) {
        const newReq = await res.json();
        router.push(newReq?.id ? `/dashboard/maintenance/${newReq.id}` : "/dashboard/maintenance");
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || err.message}`);
      }
    } catch {
      alert("Failed to submit maintenance request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:outline-none transition-all text-sm";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/maintenance"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-all">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-orange-400" />
            New Maintenance Request
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isTenant(me.role)
              ? "Report an issue in your unit and we'll get it sorted"
              : "Log a maintenance request for any property unit"}
          </p>
        </div>
      </div>

      {/* Tenant info banner */}
      {isTenant(me.role) && (
        <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-300">
            {tenantUnit ? (
              <>Submitting for <strong>Unit {tenantUnit.unitNumber}</strong> — {tenantUnit.propertyName}. Our team will review and prioritize your request.</>
            ) : (
              <>We couldn't find your assigned unit. Please contact management.</>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-5">

          {/* Unit selection — staff only */}
          {!isTenant(me.role) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Property <span className="text-red-400">*</span></label>
                <select value={selectedPropertyId}
                  onChange={e => { setSelectedPropertyId(e.target.value); setSelectedUnitId(""); }}
                  className={inputCls} required>
                  <option value="">Select property...</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Unit <span className="text-red-400">*</span></label>
                <select value={selectedUnitId} onChange={e => setSelectedUnitId(e.target.value)}
                  className={inputCls} required disabled={!selectedPropertyId}>
                  <option value="">Select unit...</option>
                  {filteredUnits.map(u => (
                    <option key={u.id} value={u.id}>Unit {u.unitNumber}</option>
                  ))}
                </select>
                {!selectedPropertyId && (
                  <p className="text-xs text-gray-600 mt-1">Select a property first</p>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className={labelCls}>Issue Title <span className="text-red-400">*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Leaking pipe under kitchen sink"
              className={inputCls} required maxLength={120} />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description <span className="text-red-400">*</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe the problem in detail — when it started, how severe it is, anything relevant..."
              rows={4} className={inputCls} required />
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Category <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-medium transition-all ${
                    category === cat.value
                      ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                      : "bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                  }`}>
                  <span className="text-lg">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority — staff only */}
          {canSetPriority(me.role) && (
            <div>
              <label className={labelCls}>Priority</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PRIORITIES.map(p => (
                  <button key={p.value} type="button"
                    onClick={() => setPriority(p.value)}
                    className={`flex flex-col gap-0.5 px-3 py-3 rounded-xl border text-left transition-all ${
                      priority === p.value
                        ? `${p.bg} ${p.color} border-current`
                        : "bg-gray-900/50 border-gray-700 text-gray-500 hover:border-gray-500"
                    }`}>
                    <span className="font-semibold text-sm">{p.label}</span>
                    <span className="text-xs opacity-70">{p.desc}</span>
                  </button>
                ))}
              </div>
              {priority === "EMERGENCY" && (
                <div className="flex items-center gap-2 mt-2 text-sm text-red-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Emergency requests are flagged immediately and jump to the top of the queue.
                </div>
              )}
            </div>
          )}

          {/* Estimated cost — admin/manager only */}
          {canSetCost(me.role) && (
            <div>
              <label className={labelCls}>Estimated Cost (KSH) <span className="text-gray-600">(Optional)</span></label>
              <input type="number" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)}
                placeholder="0.00" min="0" step="0.01" className={inputCls} />
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/maintenance">
            <button type="button" className="px-4 py-2.5 border border-gray-700 text-gray-300 rounded-xl hover:bg-gray-800 transition-all text-sm">
              Cancel
            </button>
          </Link>
          <button type="submit"
            disabled={isSubmitting || (isTenant(me.role) && !tenantUnit)}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl transition-all text-sm font-semibold flex items-center gap-2 shadow-lg shadow-orange-900/30 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
