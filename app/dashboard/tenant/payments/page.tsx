"use client";

import { useEffect, useState } from "react";
import {
  CreditCard, Smartphone, Building2, CheckCircle, Clock, XCircle,
  AlertCircle, ArrowRight, Loader2, ChevronDown, ChevronUp, DollarSign,
  Calendar, RefreshCw, Zap
} from "lucide-react";

const KES = (n: number) => `KES ${Math.round(n || 0).toLocaleString()}`;
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "—";
const fmtMonth = (d: any) => d ? new Date(d).toLocaleDateString("en-KE", { month: "long", year: "numeric" }) : "—";

const STATUS_STYLES: Record<string, string> = {
  PAID:    "bg-green-500/10 text-green-400 border-green-500/30",
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  OVERDUE: "bg-red-500/10 text-red-400 border-red-500/30",
  PARTIAL: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

export default function TenantPaymentsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [methods, setMethods] = useState<any>(null);
  const [deposit, setDeposit] = useState<any>(null);
  const [baseRent, setBaseRent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [advanceMonths, setAdvanceMonths] = useState(1);
  const [showAdvance, setShowAdvance] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // M-Pesa STK Push state
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaInputFor, setMpesaInputFor] = useState<string | null>(null); // billId | "deposit" | null
  const [mpesaSubmitting, setMpesaSubmitting] = useState(false);
  const [mpesaPolling, setMpesaPolling] = useState<string | null>(null); // billId being polled
  const [mpesaSent, setMpesaSent] = useState<string | null>(null);       // billId | "deposit" after sent

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const load = async () => {
    try {
      const [billsRes, methodsRes] = await Promise.all([
        fetch("/api/tenant/bills"),
        fetch("/api/tenant/payments/payment-methods"),
      ]);
      const billsData = await billsRes.json();
      const methodsData = await methodsRes.json();
      setBills(billsData.bills || []);
      setDeposit(billsData.deposit || null);
      setBaseRent(billsData.baseRent || 0);
      setMethods(methodsData);
    } catch {
      showToast("error", "Failed to load payment data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Check for Paystack redirect
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference");
    if (params.get("payment") === "success" && ref) {
      window.history.replaceState({}, '', '/dashboard/tenant/payments');
      fetch(`/api/tenant/payments/verify?reference=${ref}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) showToast("success", `Payment of ${KES(d.amount)} confirmed!`);
          else showToast("error", "Payment verification failed. Contact support.");
          load();
        });
    }
  }, []);

  const handlePaystack = async (billId: string) => {
    setPaying(billId);
    try {
      const res = await fetch("/api/tenant/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate payment");
      window.location.href = data.authorizationUrl;
    } catch (err: any) {
      showToast("error", err.message);
      setPaying(null);
    }
  };

  const handleAdvanceRent = async () => {
    setPaying("advance");
    try {
      const amount = baseRent * advanceMonths;
      const res = await fetch("/api/tenant/payments/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: advanceMonths, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate advance payment");
      window.location.href = data.authorizationUrl;
    } catch (err: any) {
      showToast("error", err.message);
      setPaying(null);
    }
  };

  const handleMpesaStk = async (billId: string | null, amount: number, isDeposit = false) => {
    if (!mpesaPhone.trim()) return;
    setMpesaSubmitting(true);
    const key = isDeposit ? "deposit" : billId!;
    try {
      const res = await fetch("/api/payments/mpesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: mpesaPhone.trim(),
          amount,
          billId: billId ?? undefined,
          depositMode: isDeposit || undefined,
          description: isDeposit ? "Security Deposit — Makeja Homes" : "Rent Payment — Makeja Homes",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "M-Pesa request failed");
      setMpesaSent(key);
      setMpesaInputFor(null);
      showToast("success", data.message || "Check your phone for the M-Pesa prompt");
      // Poll after 30 seconds
      setMpesaPolling(key);
      setTimeout(async () => {
        await load();
        setMpesaPolling(null);
        // After reload, bills state updates — check if this bill is now paid
        showToast("success", "Bills refreshed — check payment status above");
      }, 30000);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setMpesaSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );

  const unpaidBills = bills.filter(b => b.status !== "PAID" || b.isPartial);
  const paidBills = bills.filter(b => b.status === "PAID" && !b.isPartial);
  const totalOutstanding = unpaidBills.reduce((s, b) => s + (b.balance || b.total || 0), 0);
  const hasMpesa = methods?.mpesa?.till?.available || methods?.mpesa?.paybill?.available || methods?.mpesa?.phone?.available;
  const hasPaystack = methods?.paystack?.available;
  // STK Push availability is detected client-side: the API returns 503 when not configured.
  // We optimistically show the button and surface the error inline if the env is missing.
  const hasStkPush = true;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm shadow-xl ${toast.type === "success" ? "bg-green-900/90 border-green-500/40 text-green-200" : "bg-red-900/90 border-red-500/40 text-red-200"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-gray-400 text-sm mt-0.5">View bills, outstanding balances, and pay</p>
        </div>
        <button onClick={load} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Outstanding summary */}
      {totalOutstanding > 0 && (
        <div className="bg-gradient-to-r from-red-950/40 to-orange-950/40 border border-red-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Outstanding</p>
              <p className="text-3xl font-bold text-white">{KES(totalOutstanding)}</p>
              <p className="text-gray-400 text-xs mt-1">{unpaidBills.length} bill{unpaidBills.length > 1 ? "s" : ""} pending</p>
            </div>
            <AlertCircle className="w-10 h-10 text-red-400/40" />
          </div>
        </div>
      )}

      {/* Deposit alert */}
      {deposit?.outstanding && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-400 font-semibold text-sm">Security Deposit Outstanding: {KES(deposit.amount)}</p>
            <p className="text-gray-400 text-xs mt-0.5 mb-3">Your security deposit must be paid before your tenancy is fully activated.</p>

            {mpesaSent === "deposit" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>M-Pesa prompt sent — enter your PIN on your phone</span>
                </div>
                {mpesaPolling === "deposit" && (
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Checking payment status in ~30 seconds…
                  </div>
                )}
              </div>
            ) : mpesaInputFor === "deposit" ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Enter your M-Pesa phone number</p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={mpesaPhone}
                    onChange={e => setMpesaPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className="flex-1 bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500"
                  />
                  <button
                    onClick={() => handleMpesaStk(null, deposit.amount, true)}
                    disabled={mpesaSubmitting || !mpesaPhone.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition"
                  >
                    {mpesaSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Send
                  </button>
                  <button
                    onClick={() => setMpesaInputFor(null)}
                    className="px-3 py-2 text-gray-400 hover:text-white text-sm rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-gray-500">You will receive a PIN prompt on your phone</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {hasPaystack && (
                  <button
                    onClick={async () => {
                      setPaying("deposit");
                      try {
                        const res = await fetch("/api/tenant/payments/deposit", { method: "POST" });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Failed to initiate deposit payment");
                        window.location.href = data.authorizationUrl;
                      } catch (err: any) {
                        showToast("error", err.message);
                        setPaying(null);
                      }
                    }}
                    disabled={paying === "deposit"}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-sm rounded-lg transition"
                  >
                    {paying === "deposit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    Pay via Card
                  </button>
                )}
                {hasStkPush && (
                  <button
                    onClick={() => { setMpesaInputFor("deposit"); setMpesaPhone(""); }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white font-semibold text-sm rounded-lg transition"
                  >
                    <Smartphone className="w-4 h-4" />
                    Pay via M-Pesa STK
                  </button>
                )}
                {!hasPaystack && !hasStkPush && (
                  <p className="text-xs text-amber-400/70">Contact your property manager to arrange payment.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment methods reference */}
      {methods && (hasMpesa || hasPaystack || methods?.bank?.available) && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
          <p className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-purple-400" /> Payment Details — {methods.property?.name}
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {methods.mpesa?.till?.available && (
              <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                <Smartphone className="w-4 h-4 text-green-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">M-PESA Till</p>
                  <p className="text-green-400 font-mono font-bold text-sm">{methods.mpesa.till.number}</p>
                  {methods.mpesa.till.name && <p className="text-xs text-gray-500">{methods.mpesa.till.name}</p>}
                </div>
              </div>
            )}
            {methods.mpesa?.paybill?.available && (
              <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                <Smartphone className="w-4 h-4 text-green-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">M-PESA Paybill</p>
                  <p className="text-green-400 font-mono font-bold text-sm">{methods.mpesa.paybill.number}</p>
                  {methods.mpesa.paybill.name && <p className="text-xs text-gray-500">Account: {methods.mpesa.paybill.name}</p>}
                </div>
              </div>
            )}
            {methods.mpesa?.phone?.available && (
              <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                <Smartphone className="w-4 h-4 text-green-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">M-PESA Send Money</p>
                  <p className="text-green-400 font-mono font-bold text-sm">{methods.mpesa.phone.number}</p>
                </div>
              </div>
            )}
            {methods.bank?.accounts?.map((acc: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">{acc.bankName || "Bank Transfer"}</p>
                  <p className="text-blue-400 font-mono font-bold text-sm">{acc.accountNumber}</p>
                  {acc.accountName && <p className="text-xs text-gray-500">{acc.accountName}</p>}
                </div>
              </div>
            ))}
          </div>
          {methods.instructions && (
            <p className="text-xs text-yellow-200/70 mt-3 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">{methods.instructions}</p>
          )}
        </div>
      )}

      {/* Advance rent payment */}
      {baseRent > 0 && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowAdvance(!showAdvance)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-purple-400" />
              <div className="text-left">
                <p className="text-white text-sm font-semibold">Pay Rent in Advance</p>
                <p className="text-gray-500 text-xs">Cover multiple months at once</p>
              </div>
            </div>
            {showAdvance ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showAdvance && (
            <div className="px-5 pb-5 border-t border-gray-800 pt-4 space-y-4">
              <p className="text-gray-400 text-xs">Select how many months of rent to pay. Water and garbage will still be billed monthly (readings required). Monthly rent: <strong className="text-white">{KES(baseRent)}</strong></p>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Number of Months</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={1} max={12} value={advanceMonths}
                    onChange={e => setAdvanceMonths(Number(e.target.value))}
                    className="flex-1 accent-purple-500"
                  />
                  <span className="text-white font-bold w-8 text-center">{advanceMonths}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 month</span><span>12 months</span>
                </div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Total for {advanceMonths} month{advanceMonths > 1 ? "s" : ""}</p>
                  <p className="text-xl font-bold text-white">{KES(baseRent * advanceMonths)}</p>
                </div>
                <button
                  onClick={handleAdvanceRent}
                  disabled={paying === "advance" || !hasPaystack}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:shadow-lg hover:shadow-purple-500/30 transition"
                >
                  {paying === "advance" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Pay via Paystack
                </button>
              </div>
              {!hasPaystack && (
                <p className="text-xs text-gray-500">Advance payment via Paystack is not configured for your property. Contact your manager.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bills */}
      {bills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <DollarSign className="w-12 h-12 text-gray-700 mb-3" />
          <p className="text-gray-400 font-medium">No bills yet</p>
          <p className="text-gray-600 text-sm mt-1">Bills will appear here once generated by your property manager</p>
        </div>
      ) : (
        <>
          {/* Unpaid */}
          {unpaidBills.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold px-1">Outstanding Bills</p>
              {unpaidBills.map(bill => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  methods={methods}
                  expanded={expandedId === bill.id}
                  onToggle={() => setExpandedId(expandedId === bill.id ? null : bill.id)}
                  paying={paying}
                  onPaystack={() => handlePaystack(bill.id)}
                  hasStkPush={hasStkPush}
                  mpesaInputFor={mpesaInputFor}
                  setMpesaInputFor={setMpesaInputFor}
                  mpesaPhone={mpesaPhone}
                  setMpesaPhone={setMpesaPhone}
                  mpesaSubmitting={mpesaSubmitting}
                  mpesaSent={mpesaSent}
                  mpesaPolling={mpesaPolling}
                  onMpesaStk={(amount: number) => handleMpesaStk(bill.id, amount)}
                />
              ))}
            </div>
          )}

          {/* Paid history */}
          {paidBills.length > 0 && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition"
              >
                <span className="text-white text-sm font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Payment History ({paidBills.length})
                </span>
                {historyOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {historyOpen && (
                <div className="border-t border-gray-800 divide-y divide-gray-800/50">
                  {paidBills.map(bill => (
                    <div key={bill.id} className="px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{fmtMonth(bill.month)}</p>
                        <p className="text-gray-500 text-xs mt-0.5">Paid {fmtDate(bill.paidDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-semibold">{KES(bill.total)}</p>
                        <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">PAID</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BillCard({
  bill, methods, expanded, onToggle, paying, onPaystack,
  hasStkPush, mpesaInputFor, setMpesaInputFor, mpesaPhone, setMpesaPhone,
  mpesaSubmitting, mpesaSent, mpesaPolling, onMpesaStk,
}: any) {
  const status = bill.isPartial ? "PARTIAL" : bill.status;
  const hasPaystack = methods?.paystack?.available;
  const hasMpesa = methods?.mpesa?.till?.available || methods?.mpesa?.paybill?.available || methods?.mpesa?.phone?.available;
  const balanceDue = bill.isPartial ? bill.balance : bill.total;
  const isSent = mpesaSent === bill.id;
  const isPolling = mpesaPolling === bill.id;
  const isInputOpen = mpesaInputFor === bill.id;

  return (
    <div className={`border rounded-xl overflow-hidden ${status === "OVERDUE" ? "border-red-500/30 bg-red-950/10" : "border-gray-700 bg-gray-900/50"}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-gray-800/30 transition text-left">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-white font-semibold text-sm">{new Date(bill.month).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}</p>
            <p className="text-gray-400 text-xs mt-0.5">Due {new Date(bill.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-white font-bold">{KES(balanceDue)}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[status] || STATUS_STYLES.PENDING}`}>{status}</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-700/50 p-4 space-y-4 bg-black/20">
          {/* Partial progress */}
          {bill.isPartial && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-orange-400">Partially Paid: {KES(bill.amountPaid)}</span>
                <span className="text-gray-400">of {KES(bill.total)}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-orange-500 to-yellow-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (bill.amountPaid / bill.total) * 100)}%` }} />
              </div>
              <p className="text-orange-400 text-xs mt-1">Outstanding: {KES(bill.balance)}</p>
            </div>
          )}

          {/* Breakdown */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-black/30 rounded-lg p-2.5">
              <p className="text-gray-400 mb-1">Rent</p>
              <p className="text-white font-semibold">{KES(bill.rentAmount || bill.rent)}</p>
            </div>
            <div className="bg-black/30 rounded-lg p-2.5">
              <p className="text-gray-400 mb-1">Water</p>
              <p className="text-white font-semibold">{KES(bill.waterAmount || bill.water)}</p>
            </div>
            <div className="bg-black/30 rounded-lg p-2.5">
              <p className="text-gray-400 mb-1">Garbage</p>
              <p className="text-white font-semibold">{KES(bill.garbageAmount || bill.garbage)}</p>
            </div>
          </div>

          {/* Payment actions */}
          <div className="space-y-2">
            {/* Paystack — primary */}
            {hasPaystack && (
              <button
                onClick={onPaystack}
                disabled={!!paying}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:shadow-lg hover:shadow-purple-500/30 transition"
              >
                {paying === bill.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {paying === bill.id ? "Processing..." : `Pay ${KES(balanceDue)} via Card`}
              </button>
            )}

            {/* M-Pesa STK Push — secondary */}
            {hasStkPush && (
              isSent ? (
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>M-Pesa prompt sent — enter your PIN on your phone</span>
                  </div>
                  {isPolling && (
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Checking payment status in ~30 seconds…
                    </div>
                  )}
                  {!isPolling && (
                    <p className="text-gray-500 text-xs">Payment may take a moment to reflect. Refresh the page to check.</p>
                  )}
                </div>
              ) : isInputOpen ? (
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-2">
                  <p className="text-green-400 text-xs font-medium flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" /> M-Pesa STK Push — {KES(balanceDue)}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={mpesaPhone}
                      onChange={(e: any) => setMpesaPhone(e.target.value)}
                      placeholder="07XX XXX XXX"
                      className="flex-1 bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-green-500"
                    />
                    <button
                      onClick={() => onMpesaStk(balanceDue)}
                      disabled={mpesaSubmitting || !mpesaPhone?.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition"
                    >
                      {mpesaSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Send
                    </button>
                    <button
                      onClick={() => setMpesaInputFor(null)}
                      className="px-3 py-2 text-gray-400 hover:text-white text-sm rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">You will receive a PIN prompt on your phone</p>
                </div>
              ) : (
                <button
                  onClick={() => { setMpesaInputFor(bill.id); setMpesaPhone(""); }}
                  disabled={!!paying}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-900/40 hover:bg-green-800/50 border border-green-700/40 text-green-300 rounded-lg text-sm font-semibold disabled:opacity-50 transition"
                >
                  <Smartphone className="w-4 h-4" />
                  Pay via M-Pesa STK Push
                </button>
              )
            )}

            {/* Manual M-Pesa instructions (if only manual pay info is configured) */}
            {hasMpesa && !hasStkPush && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-xs">
                <p className="text-green-400 font-medium mb-2 flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Pay via M-PESA</p>
                {methods?.mpesa?.till?.available && <p className="text-gray-400">Till: <span className="text-white font-mono">{methods.mpesa.till.number}</span></p>}
                {methods?.mpesa?.paybill?.available && <p className="text-gray-400 mt-1">Paybill: <span className="text-white font-mono">{methods.mpesa.paybill.number}</span></p>}
                {methods?.mpesa?.phone?.available && <p className="text-gray-400 mt-1">Send Money: <span className="text-white font-mono">{methods.mpesa.phone.number}</span></p>}
                <p className="text-gray-500 mt-2">Amount: <span className="text-white font-semibold">{KES(balanceDue)}</span> · Then notify your manager to verify.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
