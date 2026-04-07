"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Home, DollarSign, Loader2, AlertCircle,
  CheckCircle, ChevronRight, Receipt, SplitSquareHorizontal,
} from "lucide-react";

interface Property { id: string; name: string; location: string; }
interface Unit {
  id: string; unitNumber: string; rentAmount: number; status: string; propertyId: string;
  properties: { id: string; name: string; };
  tenant: { id: string; rentAmount: number; users: { firstName: string; lastName: string; email: string; }; } | null;
}
interface Bill {
  id: string; month: string; totalAmount: number; amountPaid: number;
  balance: number; status: string; dueDate: string; isPartial: boolean;
}

const KES = (n: number) => `KES ${Math.round(n || 0).toLocaleString()}`;
const fmtMonth = (d: string) => new Date(d).toLocaleDateString("en-KE", { month: "long", year: "numeric" });

export default function RecordPaymentClient({ properties, units }: { properties: Property[]; units: Unit[]; }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Selection
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Bills
  const [bills, setBills] = useState<Bill[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string>("none");
  const selectedBill = bills.find(b => b.id === selectedBillId) || null;

  // Payment fields
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const filteredUnits = useMemo(() =>
    selectedPropertyId ? units.filter(u => u.propertyId === selectedPropertyId) : []
  , [selectedPropertyId, units]);

  const isPartial = selectedBill && parseFloat(amount) > 0 && parseFloat(amount) < selectedBill.balance;
  const isOverpay = selectedBill && parseFloat(amount) > selectedBill.balance;

  const handleUnitChange = (unitId: string) => {
    const unit = units.find(u => u.id === unitId) || null;
    setSelectedUnitId(unitId);
    setSelectedUnit(unit);
    setSelectedBillId("none");
    setBills([]);
    setAmount(unit?.tenant ? String(unit.tenant.rentAmount || unit.rentAmount) : "");
    if (unit?.tenant) fetchBills(unit.tenant.id);
  };

  const fetchBills = async (tenantId: string) => {
    setLoadingBills(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/bills`);
      if (res.ok) {
        const data = await res.json();
        setBills(data.bills || []);
      }
    } catch {}
    finally { setLoadingBills(false); }
  };

  // Auto-fill amount when bill selected
  useEffect(() => {
    if (selectedBill) setAmount(String(selectedBill.balance));
  }, [selectedBillId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) { setError("Please select a unit."); return; }
    if (!selectedUnit.tenant && selectedUnit.status === "OCCUPIED") {
      setError("No tenant found for this unit."); return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/payments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedUnit.tenant?.id || null,
          amount: amt,
          paymentMethod,
          paymentDate,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          billId: selectedBillId !== "none" ? selectedBillId : null,
          isPartial: !!isPartial,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");

      setSuccess(true);
      setTimeout(() => router.push("/dashboard/admin/payments"), 1800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="p-4 bg-green-500/20 rounded-full">
        <CheckCircle className="w-10 h-10 text-green-400" />
      </div>
      <p className="text-white text-xl font-bold">Payment Recorded</p>
      <p className="text-gray-400 text-sm">Redirecting to payments...</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Step 1 — Unit selection */}
      <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-cyan-400" /> Select Unit
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Property</label>
            <select
              value={selectedPropertyId}
              onChange={e => { setSelectedPropertyId(e.target.value); setSelectedUnitId(""); setSelectedUnit(null); setBills([]); }}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
            >
              <option value="">Choose property…</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Unit</label>
            <select
              value={selectedUnitId}
              onChange={e => handleUnitChange(e.target.value)}
              disabled={!selectedPropertyId}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none disabled:opacity-40"
            >
              <option value="">{selectedPropertyId ? "Choose unit…" : "Select property first"}</option>
              {filteredUnits.map(u => (
                <option key={u.id} value={u.id}>
                  Unit {u.unitNumber}{u.tenant ? ` — ${u.tenant.users.firstName} ${u.tenant.users.lastName}` : " (Vacant)"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedUnit?.tenant && (
          <div className="flex items-center gap-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-sm">
            <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
              <span className="text-purple-300 font-bold text-xs">
                {selectedUnit.tenant.users.firstName[0]}{selectedUnit.tenant.users.lastName[0]}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold">{selectedUnit.tenant.users.firstName} {selectedUnit.tenant.users.lastName}</p>
              <p className="text-gray-400 text-xs">{selectedUnit.tenant.users.email} · Unit {selectedUnit.unitNumber} · {KES(selectedUnit.tenant.rentAmount)}/mo</p>
            </div>
          </div>
        )}
      </div>

      {/* Step 2 — Bill selection */}
      {selectedUnit?.tenant && (
        <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" /> Apply to Bill <span className="text-gray-500 text-xs font-normal ml-1">(optional)</span>
          </h2>

          {loadingBills ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading bills…
            </div>
          ) : (
            <div className="space-y-2">
              <label
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  selectedBillId === "none"
                    ? "border-purple-500/50 bg-purple-500/10"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <input type="radio" name="bill" value="none" checked={selectedBillId === "none"}
                  onChange={() => setSelectedBillId("none")} className="accent-purple-500" />
                <span className="text-sm text-gray-300">No specific bill — general payment</span>
              </label>

              {bills.filter(b => b.status !== "PAID" || b.isPartial).map(bill => (
                <label
                  key={bill.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    selectedBillId === bill.id
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                >
                  <input type="radio" name="bill" value={bill.id} checked={selectedBillId === bill.id}
                    onChange={() => setSelectedBillId(bill.id)} className="accent-amber-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white font-medium">{fmtMonth(bill.month)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        bill.status === "OVERDUE"
                          ? "bg-red-500/10 text-red-400 border-red-500/30"
                          : bill.isPartial
                          ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                          : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                      }`}>
                        {bill.isPartial ? "Partial" : bill.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      <span>Total: {KES(bill.totalAmount)}</span>
                      {bill.isPartial && <span>Paid: {KES(bill.amountPaid)}</span>}
                      <span className="text-amber-400 font-medium">Balance: {KES(bill.balance)}</span>
                    </div>
                    {bill.isPartial && (
                      <div className="mt-1.5 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, (bill.amountPaid / bill.totalAmount) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </label>
              ))}

              {bills.filter(b => b.status !== "PAID" || b.isPartial).length === 0 && (
                <p className="text-gray-500 text-sm py-2">No outstanding bills found for this tenant.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Payment details */}
      <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-400" /> Payment Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Amount (KES) *
              {selectedBill && (
                <span className="ml-2 text-amber-400">Balance due: {KES(selectedBill.balance)}</span>
              )}
            </label>
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              required min="1" step="1" placeholder="0"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none"
            />
            {isPartial && (
              <p className="flex items-center gap-1.5 mt-1.5 text-orange-400 text-xs">
                <SplitSquareHorizontal className="w-3 h-3" />
                Partial payment — {KES(selectedBill!.balance - parseFloat(amount))} will remain outstanding
              </p>
            )}
            {isOverpay && (
              <p className="flex items-center gap-1.5 mt-1.5 text-blue-400 text-xs">
                <AlertCircle className="w-3 h-3" />
                Amount exceeds balance — {KES(parseFloat(amount) - selectedBill!.balance)} overpayment
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Payment Method *</label>
            <select
              value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none"
            >
              <option value="CASH">Cash</option>
              <option value="M_PESA">M-Pesa</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Payment Date *</label>
            <input
              type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Reference / Transaction ID</label>
            <input
              type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)}
              placeholder="M-Pesa code, bank ref…"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Notes</label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Optional notes about this payment…"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-sm rounded-lg transition">
          Cancel
        </button>
        <button
          type="submit" disabled={submitting || !selectedUnit}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition shadow-lg shadow-green-500/20"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Record Payment
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
