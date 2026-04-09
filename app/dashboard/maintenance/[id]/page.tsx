"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Wrench, MapPin, User, Calendar, Clock,
  CheckCircle, AlertTriangle, Ban, Play, ThumbsUp,
  DollarSign, Package, Plus, Trash2, RefreshCw,
  ChevronRight, X, Loader2, Building2, Phone,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  EMERGENCY: { label: "Emergency", color: "text-red-400",    bg: "bg-red-500/10 border-red-500/40",    dot: "bg-red-500" },
  HIGH:      { label: "High",      color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/40", dot: "bg-orange-500" },
  MEDIUM:    { label: "Medium",    color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/40", dot: "bg-yellow-400" },
  LOW:       { label: "Low",       color: "text-green-400",  bg: "bg-green-500/10 border-green-500/40",  dot: "bg-green-400" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; step: number }> = {
  PENDING:     { label: "Pending Review", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", step: 0 },
  OPEN:        { label: "Approved / Open", color: "text-blue-400",  bg: "bg-blue-500/10 border-blue-500/30",     step: 1 },
  ASSIGNED:    { label: "Assigned",        color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/30", step: 1 },
  IN_PROGRESS: { label: "In Progress",     color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30", step: 2 },
  AWAITING_PARTS: { label: "Awaiting Parts", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", step: 2 },
  COMPLETED:   { label: "Completed",       color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30",  step: 3 },
  CANCELLED:   { label: "Cancelled",       color: "text-red-400",    bg: "bg-red-500/10 border-red-500/30",      step: -1 },
};

const TIMELINE_STEPS = ["Submitted", "Approved", "In Progress", "Completed"];

function timeAgo(date: string | Date) {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (d < 1) return "just now";
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

// ── Modal: Assign staff ───────────────────────────────────────────────────────
function AssignModal({ onClose, onAssign, loading }: {
  onClose: () => void;
  onAssign: (userId: string, priority: string) => void;
  loading: boolean;
}) {
  const [staff, setStaff] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  useEffect(() => {
    fetch("/api/users?roles=CARETAKER,MANAGER,ADMIN")
      .then(r => r.json())
      .then(d => setStaff(Array.isArray(d) ? d : (d.users ?? [])))
      .catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Assign & Approve</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Assign to</label>
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500/50"
            >
              <option value="">Select staff member...</option>
              {staff.map((s: any) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {["LOW","MEDIUM","HIGH","EMERGENCY"].map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${priority === p ? (PRIORITY_CONFIG[p]?.bg + " " + PRIORITY_CONFIG[p]?.color) : "border-gray-700 text-gray-500 hover:border-gray-600"}`}
                >
                  {p[0] + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-xl text-sm hover:border-gray-600 transition-all">
              Cancel
            </button>
            <button
              onClick={() => selected && onAssign(selected, priority)}
              disabled={!selected || loading}
              className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:from-orange-600 hover:to-red-700 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Approve & Assign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Complete ───────────────────────────────────────────────────────────
function CompleteModal({ onClose, onComplete, loading }: {
  onClose: () => void;
  onComplete: (cost: number | null, notes: string) => void;
  loading: boolean;
}) {
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Mark as Completed</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Actual Cost (KES)</label>
            <input
              type="number"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-green-500/50"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Completion Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What was done, parts replaced, etc..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-green-500/50 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-xl text-sm hover:border-gray-600 transition-all">Cancel</button>
            <button
              onClick={() => onComplete(cost ? parseFloat(cost) : null, notes)}
              disabled={loading}
              className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:from-green-600 hover:to-emerald-700 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Mark Complete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Reject ─────────────────────────────────────────────────────────────
function RejectModal({ onClose, onReject, loading }: {
  onClose: () => void;
  onReject: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Reject Request</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Reason for rejection</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Explain why this request is being rejected..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-xl text-sm hover:border-gray-600 transition-all">Cancel</button>
            <button
              onClick={() => reason.trim() && onReject(reason)}
              disabled={!reason.trim() || loading}
              className="flex-1 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Reject"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Materials panel ───────────────────────────────────────────────────────────
function MaterialsPanel({ requestId, role }: { requestId: string; role: string }) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [totals, setTotals] = useState({ totalCost: 0, count: 0 });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ inventoryItemId: "", itemName: "", quantity: "1", unitCost: "", unit: "units", deductFromInventory: true });

  const canEdit = ["ADMIN", "MANAGER", "CARETAKER", "STOREKEEPER"].includes(role);

  const loadMaterials = useCallback(() => {
    fetch(`/api/maintenance/${requestId}/materials`)
      .then(r => r.json())
      .then(d => { setMaterials(d.materials ?? []); setTotals(d.totals ?? { totalCost: 0, count: 0 }); })
      .catch(() => {});
  }, [requestId]);

  useEffect(() => {
    loadMaterials();
    if (canEdit) {
      fetch("/api/inventory")
        .then(r => r.json())
        .then(d => setInventory(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
  }, [requestId, canEdit, loadMaterials]);

  const handleInventorySelect = (id: string) => {
    const item = inventory.find(i => i.id === id);
    if (item) {
      setForm(f => ({
        ...f,
        inventoryItemId: id,
        itemName: item.name,
        unitCost: String(item.unitCost ?? 0),
        unit: item.unitOfMeasure ?? "units",
      }));
    } else {
      setForm(f => ({ ...f, inventoryItemId: "", itemName: "", unitCost: "" }));
    }
  };

  const saveMaterial = async () => {
    if (!form.itemName || !form.quantity) return;
    setSaving(true);
    try {
      await fetch(`/api/maintenance/${requestId}/materials`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: form.inventoryItemId || null,
          itemName: form.itemName,
          quantity: parseFloat(form.quantity),
          unitCost: parseFloat(form.unitCost || "0"),
          unit: form.unit,
          deductFromInventory: form.deductFromInventory && !!form.inventoryItemId,
        }),
      });
      setAdding(false);
      setForm({ inventoryItemId: "", itemName: "", quantity: "1", unitCost: "", unit: "units", deductFromInventory: true });
      loadMaterials();
    } catch {}
    setSaving(false);
  };

  const deleteMaterial = async (id: string) => {
    await fetch(`/api/maintenance/${requestId}/materials?materialId=${id}`, { method: "DELETE" });
    loadMaterials();
  };

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Materials Used</p>
          {totals.count > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">{totals.count} items · KES {Number(totals.totalCost).toLocaleString()}</p>
          )}
        </div>
        {canEdit && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium rounded-xl hover:bg-orange-500/20 transition-all"
          >
            <Plus className="w-3 h-3" /> Add Material
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-4 p-4 bg-gray-800/60 border border-gray-700 rounded-xl space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {inventory.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">From Inventory (optional)</label>
                <select
                  value={form.inventoryItemId}
                  onChange={e => handleInventorySelect(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none appearance-none"
                >
                  <option value="">— Manual entry —</option>
                  {inventory.map((i: any) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.quantity} {i.unitOfMeasure} available)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Item name *</label>
                <input
                  value={form.itemName}
                  onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))}
                  placeholder="e.g. PVC Pipe"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Quantity *</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  min="0.1"
                  step="0.1"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Unit cost (KES)</label>
                <input
                  type="number"
                  value={form.unitCost}
                  onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Unit</label>
                <select
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none appearance-none"
                >
                  {["units","pieces","meters","liters","kg","boxes","rolls","sets"].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            {form.inventoryItemId && (
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.deductFromInventory}
                  onChange={e => setForm(f => ({ ...f, deductFromInventory: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                Deduct from inventory stock
              </label>
            )}
            {form.quantity && form.unitCost && (
              <p className="text-xs text-orange-400 font-semibold">
                Total: KES {(parseFloat(form.quantity || "0") * parseFloat(form.unitCost || "0")).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-xl text-xs hover:border-gray-600 transition-all">Cancel</button>
            <button onClick={saveMaterial} disabled={saving || !form.itemName} className="flex-1 py-2 bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-orange-500/30 transition-all">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "Save Material"}
            </button>
          </div>
        </div>
      )}

      {/* Materials list */}
      {materials.length === 0 ? (
        <p className="text-xs text-gray-600 py-4 text-center">No materials recorded yet</p>
      ) : (
        <div className="space-y-2">
          {materials.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 py-2 border-b border-gray-800/60 last:border-0">
              <Package className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{m.itemName}</p>
                <p className="text-xs text-gray-500">{m.quantity} {m.unit} × KES {Number(m.unitCost).toLocaleString()}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-orange-400">KES {Number(m.totalCost).toLocaleString()}</p>
                {m.deductedFromInventory && <p className="text-[10px] text-emerald-500">✓ Deducted</p>}
              </div>
              {canEdit && (
                <button onClick={() => deleteMaterial(m.id)} className="text-gray-700 hover:text-red-400 transition-colors ml-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <div className="flex justify-between pt-2">
            <span className="text-xs text-gray-500">Total materials cost</span>
            <span className="text-sm font-black text-white">KES {Number(totals.totalCost).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [req, setReq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState<"assign" | "complete" | "reject" | null>(null);
  const [role, setRole] = useState<string>("ADMIN");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get current user role from the profile endpoint
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.role) setRole(d.role);
    }).catch(() => {});
  }, []);

  const loadRequest = useCallback(async () => {
    try {
      const r = await fetch(`/api/maintenance/${id}`);
      if (!r.ok) { router.push("/dashboard/maintenance"); return; }
      const data = await r.json();
      setReq(data);
    } catch {}
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadRequest();
    // Poll every 20s for real-time updates
    pollRef.current = setInterval(loadRequest, 20000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadRequest]);

  const callAction = async (endpoint: string, body?: object) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/maintenance/${id}/${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json();
      if (res.ok) {
        await loadRequest();
        setModal(null);
      } else {
        alert(data.error || "Action failed");
      }
    } catch {
      alert("Network error. Please try again.");
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-xl bg-gray-800/40 animate-pulse" />
        <div className="h-64 rounded-2xl bg-gray-800/40 animate-pulse" />
      </div>
    );
  }

  if (!req) return null;

  const pri = PRIORITY_CONFIG[req.priority] ?? PRIORITY_CONFIG.MEDIUM;
  const sta = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING;
  const unit = req.units ?? {};
  const prop = unit.properties ?? {};
  const tenants = unit.tenants ?? [];
  const createdBy = req.users_maintenance_requests_createdByIdTousers;
  const assignedTo = req.users_maintenance_requests_assignedToIdTousers;

  const isAdmin = ["ADMIN", "MANAGER"].includes(role);
  const isWorker = ["ADMIN", "MANAGER", "CARETAKER"].includes(role);
  const isCancelled = req.status === "CANCELLED";
  const isCompleted = req.status === "COMPLETED";
  const isDone = isCancelled || isCompleted;

  return (
    <>
      {modal === "assign"   && <AssignModal   onClose={() => setModal(null)} loading={actionLoading} onAssign={(uid, pri) => callAction("assign", { assignedToId: uid, priority: pri })} />}
      {modal === "complete" && <CompleteModal onClose={() => setModal(null)} loading={actionLoading} onComplete={(cost, notes) => callAction("complete", { actualCost: cost, completionNotes: notes })} />}
      {modal === "reject"   && <RejectModal   onClose={() => setModal(null)} loading={actionLoading} onReject={(reason) => callAction("reject", { reason })} />}

      <div className="space-y-5 max-w-4xl">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Link href="/dashboard/maintenance" className="p-2 rounded-xl border border-gray-800 text-gray-500 hover:text-white hover:border-gray-600 transition-all flex-shrink-0 mt-0.5">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {req.requestNumber && <span className="text-xs font-mono text-gray-500">{req.requestNumber}</span>}
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${pri.bg} ${pri.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pri.dot} ${req.priority === "EMERGENCY" ? "animate-pulse" : ""}`} />
                {pri.label}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sta.bg} ${sta.color}`}>{sta.label}</span>
            </div>
            <h1 className="text-xl font-black text-white leading-tight">{req.title}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {prop.name} · Unit {unit.unitNumber}
              {tenants[0] && ` · ${tenants[0].users?.firstName} ${tenants[0].users?.lastName}`}
            </p>
          </div>
          <button onClick={loadRequest} className="p-2 text-gray-600 hover:text-gray-300 transition-colors rounded-xl border border-gray-800 flex-shrink-0">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress timeline */}
        {!isCancelled && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center">
              {TIMELINE_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${i <= sta.step ? "border-orange-500 bg-orange-500/20" : "border-gray-700 bg-gray-800/40"}`}>
                      {i < sta.step
                        ? <CheckCircle className="w-4 h-4 text-orange-400" />
                        : i === sta.step
                          ? <div className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
                          : <div className="w-2 h-2 rounded-full bg-gray-600" />}
                    </div>
                    <p className={`text-[10px] mt-1 font-medium ${i <= sta.step ? "text-orange-400" : "text-gray-600"}`}>{step}</p>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-5 ${i < sta.step ? "bg-orange-500/40" : "bg-gray-800"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons — role-gated */}
        {!isDone && (
          <div className="flex flex-wrap gap-2">
            {/* Approve/Assign — admin/manager, pending or open */}
            {isAdmin && ["PENDING", "OPEN"].includes(req.status) && (
              <button
                onClick={() => setModal("assign")}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-900/30"
              >
                <ThumbsUp className="w-4 h-4" /> Approve & Assign
              </button>
            )}

            {/* Start work — worker, open/assigned */}
            {isWorker && ["OPEN", "ASSIGNED", "PENDING"].includes(req.status) && req.status !== "PENDING" && (
              <button
                onClick={() => callAction("start")}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Start Work
              </button>
            )}

            {/* Complete — worker, in progress */}
            {isWorker && req.status === "IN_PROGRESS" && (
              <button
                onClick={() => setModal("complete")}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-green-900/30"
              >
                <CheckCircle className="w-4 h-4" /> Mark Complete
              </button>
            )}

            {/* Reject — admin/manager, pending/open */}
            {isAdmin && ["PENDING", "OPEN"].includes(req.status) && (
              <button
                onClick={() => setModal("reject")}
                className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium rounded-xl transition-all"
              >
                <Ban className="w-4 h-4" /> Reject
              </button>
            )}
          </div>
        )}

        {/* Completed/Cancelled banner */}
        {isCompleted && (
          <div className="flex items-center gap-3 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-2xl">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm font-bold text-green-400">Request Completed</p>
              {req.completedAt && <p className="text-xs text-gray-500">{new Date(req.completedAt).toLocaleDateString("en-KE", { dateStyle: "long" })}</p>}
            </div>
            {req.actualCost != null && (
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">Final cost</p>
                <p className="text-sm font-black text-white">KES {Number(req.actualCost).toLocaleString()}</p>
              </div>
            )}
          </div>
        )}

        {isCancelled && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl">
            <Ban className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm font-bold text-red-400">Request Cancelled</p>
              {req.completionNotes && <p className="text-xs text-gray-400 mt-0.5">{req.completionNotes}</p>}
            </div>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Description */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Wrench className="w-3.5 h-3.5" /> Description</p>
            <p className="text-sm text-gray-300 leading-relaxed">{req.description}</p>
            {req.category && (
              <span className="inline-block mt-3 px-2 py-0.5 rounded-full text-[10px] border border-gray-700 text-gray-400">
                {req.category}
              </span>
            )}
          </div>

          {/* People */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><User className="w-3.5 h-3.5" /> People</p>
            <div className="space-y-3">
              {createdBy && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">
                    {createdBy.firstName?.[0]}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reported by</p>
                    <p className="text-sm text-white font-medium">{createdBy.firstName} {createdBy.lastName}</p>
                  </div>
                </div>
              )}
              {assignedTo ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-400">
                    {assignedTo.firstName?.[0]}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Assigned to</p>
                    <p className="text-sm text-white font-medium">{assignedTo.firstName} {assignedTo.lastName}</p>
                    {assignedTo.phoneNumber && <p className="text-xs text-gray-600 flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{assignedTo.phoneNumber}</p>}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-400/70">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-xs">Not yet assigned</p>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Location</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                <span className="text-white font-medium">{prop.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                <span className="text-gray-300">Unit {unit.unitNumber}</span>
              </div>
              {prop.address && <p className="text-xs text-gray-600 ml-5">{prop.address}</p>}
            </div>
          </div>

          {/* Timeline & Cost */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Timeline & Cost</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Submitted</span>
                <span className="text-white">{req.createdAt ? timeAgo(req.createdAt) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last updated</span>
                <span className="text-white">{req.updatedAt ? timeAgo(req.updatedAt) : "—"}</span>
              </div>
              {req.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Completed</span>
                  <span className="text-green-400">{new Date(req.completedAt).toLocaleDateString("en-KE")}</span>
                </div>
              )}
              <div className="border-t border-gray-800 pt-2 mt-2 space-y-1">
                {req.estimatedCost != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Estimated cost</span>
                    <span className="text-gray-300">KES {Number(req.estimatedCost).toLocaleString()}</span>
                  </div>
                )}
                {req.actualCost != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Actual cost</span>
                    <span className="text-white font-bold">KES {Number(req.actualCost).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Completion notes */}
        {req.completionNotes && req.status === "COMPLETED" && (
          <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Completion Notes</p>
            <p className="text-sm text-gray-300 leading-relaxed">{req.completionNotes}</p>
          </div>
        )}

        {/* Materials panel */}
        <MaterialsPanel requestId={id as string} role={role} />
      </div>
    </>
  );
}
