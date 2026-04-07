"use client";

import { useEffect, useState } from "react";
import { Home, Droplet, Trash2, CheckCircle, AlertCircle, Clock, Smartphone, Building2, CreditCard, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import Link from "next/link";

const KES = (n: number) => `KES ${Math.round(n || 0).toLocaleString()}`;
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "—";
const fmtMonth = (d: any) => d ? new Date(d).toLocaleDateString("en-KE", { month: "long", year: "numeric" }) : "—";

const STATUS_STYLES: Record<string, string> = {
  PAID:    "bg-green-500/10 text-green-400 border-green-500/30",
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  OVERDUE: "bg-red-500/10 text-red-400 border-red-500/30",
  PARTIAL: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

export default function MyUnitPage() {
  const [data, setData] = useState<any>(null);
  const [methods, setMethods] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/tenant/bills").then(r => r.json()),
      fetch("/api/tenant/payments/payment-methods").then(r => r.json()),
    ]).then(([bills, pm]) => {
      setData(bills);
      setMethods(pm);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const bill = data?.currentBill;
  const deposit = data?.deposit;
  const bills = data?.bills || [];
  const history = data?.billHistory || [];
  const hasAnyBill = bills.length > 0;

  // Derive display status (PARTIAL if partially paid)
  const billStatus = bill?.isPartial ? "PARTIAL" : (bill?.status || "PENDING");

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Unit</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {data?.tenant?.propertyName || methods?.property?.name || "—"} · Unit {data?.tenant?.unitNumber || methods?.unitNumber || "—"}
        </p>
      </div>

      {/* Deposit alert */}
      {deposit?.outstanding && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-400 font-semibold text-sm">Security Deposit Outstanding</p>
            <p className="text-gray-300 text-sm mt-0.5">
              Your security deposit of <strong>{KES(deposit.amount)}</strong> has not been received. Please arrange payment with your property manager.
            </p>
          </div>
          <Link href="/dashboard/tenant/payments" className="shrink-0 text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition">
            Pay Now
          </Link>
        </div>
      )}

      {/* Current bill */}
      {bill ? (
        <div className="bg-gradient-to-br from-purple-950/30 to-black border border-purple-500/20 rounded-xl overflow-hidden">
          {/* Bill header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-purple-500/10">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Bill</p>
              <p className="text-white font-semibold">{fmtMonth(bill.month)}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[billStatus] || STATUS_STYLES.PENDING}`}>
              {billStatus}
            </span>
          </div>

          <div className="p-6 space-y-5">
            {/* Partial payment progress */}
            {bill.isPartial && (
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-orange-400 font-medium">Partially Paid</span>
                  <span className="text-gray-400">{KES(bill.amountPaid)} of {KES(bill.total)}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (bill.amountPaid / bill.total) * 100)}%` }}
                  />
                </div>
                <p className="text-orange-400 text-xs mt-1.5 font-medium">Outstanding balance: {KES(bill.balance)}</p>
              </div>
            )}

            {/* Total */}
            <div className="text-center py-4 bg-black/30 rounded-xl border border-purple-500/10">
              <p className="text-gray-400 text-xs mb-1">{bill.isPartial ? "Remaining Balance" : "Total Due"}</p>
              <p className="text-4xl font-bold text-white">{KES(bill.isPartial ? bill.balance : bill.total)}</p>
              <p className="text-gray-500 text-xs mt-1.5">Due {fmtDate(bill.dueDate)}</p>
              {bill.paidDate && (
                <p className="text-green-400 text-xs mt-1">Paid {fmtDate(bill.paidDate)}</p>
              )}
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-black/30 rounded-lg p-3 border border-purple-500/10">
                <div className="flex items-center gap-1.5 mb-2">
                  <Home className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs text-gray-400">Rent</span>
                </div>
                <p className="text-white font-semibold text-sm">{KES(bill.rent)}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-blue-500/10">
                <div className="flex items-center gap-1.5 mb-2">
                  <Droplet className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-gray-400">Water</span>
                </div>
                <p className="text-white font-semibold text-sm">{KES(bill.water)}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-green-500/10">
                <div className="flex items-center gap-1.5 mb-2">
                  <Trash2 className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs text-gray-400">Garbage</span>
                </div>
                <p className="text-white font-semibold text-sm">{KES(bill.garbage)}</p>
              </div>
            </div>

            {/* Water details */}
            {data?.waterDetails && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                <p className="text-blue-400 text-xs font-semibold mb-3 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5" /> Water Reading Details
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    ["Previous", data.waterDetails.previousReading],
                    ["Current", data.waterDetails.currentReading],
                    ["Units Used", data.waterDetails.unitsConsumed],
                    ["Rate/Unit", `KES ${data.waterDetails.ratePerUnit}`],
                  ].map(([label, val]) => (
                    <div key={label as string}>
                      <p className="text-gray-400">{label}</p>
                      <p className="text-white font-medium mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pay button — only if not fully paid */}
            {billStatus !== "PAID" && (
              <Link
                href="/dashboard/tenant/payments"
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition"
              >
                <CreditCard className="w-4 h-4" />
                {bill.isPartial ? `Pay Remaining ${KES(bill.balance)}` : `Pay ${KES(bill.total)}`}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* No bill yet — but show the unit info and what to expect */
        <div className="bg-gradient-to-br from-purple-950/20 to-black border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Home className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-white font-semibold">No bills generated yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Your first bill will appear here once your property manager generates it for this month. Bills include rent, water, and any applicable garbage fees.
              </p>
              <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                Bills are typically generated at the start of each month
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment methods info */}
      {methods && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <p className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-400" />
            How to Pay — {methods.property?.name}
          </p>
          <div className="space-y-3">
            {methods.mpesa?.till?.available && (
              <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                <Smartphone className="w-5 h-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">M-PESA Till</p>
                  <p className="text-gray-400 text-xs">Till No: <span className="text-green-400 font-mono font-bold">{methods.mpesa.till.number}</span>{methods.mpesa.till.name ? ` · ${methods.mpesa.till.name}` : ""}</p>
                </div>
              </div>
            )}
            {methods.mpesa?.paybill?.available && (
              <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                <Smartphone className="w-5 h-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">M-PESA Paybill</p>
                  <p className="text-gray-400 text-xs">Paybill: <span className="text-green-400 font-mono font-bold">{methods.mpesa.paybill.number}</span>{methods.mpesa.paybill.name ? ` · Account: ${methods.mpesa.paybill.name}` : ""}</p>
                </div>
              </div>
            )}
            {methods.mpesa?.phone?.available && (
              <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                <Smartphone className="w-5 h-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">M-PESA Send Money</p>
                  <p className="text-gray-400 text-xs">Phone: <span className="text-green-400 font-mono font-bold">{methods.mpesa.phone.number}</span></p>
                </div>
              </div>
            )}
            {methods.bank?.available && methods.bank.accounts.map((acc: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">{acc.bankName || "Bank Transfer"}</p>
                  <p className="text-gray-400 text-xs">A/C: <span className="text-blue-400 font-mono font-bold">{acc.accountNumber}</span>{acc.accountName ? ` · ${acc.accountName}` : ""}</p>
                </div>
              </div>
            ))}
            {!methods.mpesa?.till?.available && !methods.mpesa?.paybill?.available && !methods.mpesa?.phone?.available && !methods.bank?.available && (
              <p className="text-gray-500 text-sm">Contact your property manager for payment details.</p>
            )}
            {methods.instructions && (
              <div className="mt-2 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg text-xs text-yellow-200/80">
                {methods.instructions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Billing history */}
      {hasAnyBill && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition"
          >
            <span className="text-white font-semibold text-sm">Billing History</span>
            {historyOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {historyOpen && (
            <div className="overflow-x-auto border-t border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {["Month", "Rent", "Water", "Garbage", "Total", "Paid", "Status"].map(h => (
                      <th key={h} className={`py-3 px-4 text-xs text-gray-400 font-medium ${h === "Month" || h === "Status" ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b: any) => {
                    const s = b.isPartial ? "PARTIAL" : b.status;
                    return (
                      <tr key={b.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                        <td className="py-3 px-4 text-white">{fmtMonth(b.month)}</td>
                        <td className="py-3 px-4 text-right text-gray-300">{KES(b.rent)}</td>
                        <td className="py-3 px-4 text-right text-gray-300">{KES(b.water)}</td>
                        <td className="py-3 px-4 text-right text-gray-300">{KES(b.garbage)}</td>
                        <td className="py-3 px-4 text-right text-white font-medium">{KES(b.total)}</td>
                        <td className="py-3 px-4 text-right text-gray-300">{KES(b.amountPaid)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[s] || STATUS_STYLES.PENDING}`}>{s}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
