"use client";

import { useEffect, useState, useRef } from "react";
import {
  Receipt, Download, RefreshCw, CheckCircle, Clock, XCircle,
  AlertCircle, CreditCard, Smartphone, Building2, Loader2,
  DollarSign, TrendingUp, Calendar, Filter, Search, ChevronDown, ChevronUp
} from "lucide-react";

const KES = (n: number) => `KES ${Math.round(n || 0).toLocaleString()}`;
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "—";
const fmtDateTime = (d: any) => d ? new Date(d).toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtMonth = (d: any) => d ? new Date(d).toLocaleDateString("en-KE", { month: "long", year: "numeric" }) : "—";

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  RENT: "Rent", DEPOSIT: "Security Deposit", WATER: "Water Bill",
  GARBAGE: "Garbage Fee", UTILITY: "Utility", ADVANCE: "Advance Rent",
  PENALTY: "Penalty", OTHER: "Other",
};

const METHOD_ICONS: Record<string, any> = {
  PAYSTACK: CreditCard, CARD: CreditCard, M_PESA: Smartphone,
  BANK_TRANSFER: Building2, CASH: DollarSign,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  COMPLETED: { label: "Completed",  color: "bg-green-500/10 text-green-400 border-green-500/30",  icon: CheckCircle },
  VERIFIED:  { label: "Verified",   color: "bg-green-500/10 text-green-400 border-green-500/30",  icon: CheckCircle },
  PENDING:   { label: "Pending",    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", icon: Clock },
  FAILED:    { label: "Failed",     color: "bg-red-500/10 text-red-400 border-red-500/30",          icon: XCircle },
  CANCELLED: { label: "Cancelled",  color: "bg-gray-500/10 text-gray-400 border-gray-500/30",       icon: XCircle },
};

interface Payment {
  id: string;
  referenceNumber: string;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  status: string;
  verificationStatus: string;
  paymentDate: string;
  notes: string | null;
  receiptUrl: string | null;
  transactionId: string | null;
  paystackReference: string | null;
  billMonth: string | null;
  unitNumber: string;
  propertyName: string;
}

function generateReceiptHtml(p: Payment): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt — ${p.referenceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; background: #fff; }
    .header { text-align: center; border-bottom: 3px solid #8b5cf6; padding-bottom: 24px; margin-bottom: 24px; }
    .logo { font-size: 28px; font-weight: 800; color: #8b5cf6; }
    .subtitle { color: #666; font-size: 13px; margin-top: 4px; }
    .receipt-badge { display: inline-block; margin-top: 12px; background: #f0fdf4; border: 1px solid #86efac; color: #16a34a; padding: 4px 16px; border-radius: 99px; font-size: 13px; font-weight: 600; }
    .ref { text-align: center; font-size: 13px; color: #999; margin-bottom: 28px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px; }
    .field { background: #f9f9f9; padding: 14px 16px; border-radius: 8px; }
    .field-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #999; margin-bottom: 4px; }
    .field-value { font-size: 15px; font-weight: 600; color: #1a1a1a; }
    .amount-box { text-align: center; background: linear-gradient(135deg, #8b5cf6, #ec4899); color: #fff; padding: 20px; border-radius: 12px; margin: 24px 0; }
    .amount-label { font-size: 13px; opacity: 0.8; }
    .amount-value { font-size: 36px; font-weight: 800; margin-top: 4px; }
    .footer { text-align: center; border-top: 1px solid #eee; padding-top: 20px; color: #999; font-size: 12px; }
    .footer strong { color: #8b5cf6; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🏠 Makeja Homes</div>
    <div class="subtitle">Property Management · Kenya</div>
    <div class="receipt-badge">✓ Payment Receipt</div>
  </div>
  <p class="ref">Ref: ${p.referenceNumber || p.id}</p>

  <div class="amount-box">
    <div class="amount-label">Amount Paid</div>
    <div class="amount-value">KES ${Math.round(p.amount).toLocaleString()}</div>
  </div>

  <div class="grid">
    <div class="field"><div class="field-label">Payment For</div><div class="field-value">${PAYMENT_TYPE_LABELS[p.paymentType] || p.paymentType}</div></div>
    <div class="field"><div class="field-label">Status</div><div class="field-value" style="color:#16a34a">${p.status}</div></div>
    <div class="field"><div class="field-label">Date</div><div class="field-value">${fmtDateTime(p.paymentDate)}</div></div>
    <div class="field"><div class="field-label">Method</div><div class="field-value">${p.paymentMethod?.replace(/_/g, " ")}</div></div>
    <div class="field"><div class="field-label">Property</div><div class="field-value">${p.propertyName}</div></div>
    <div class="field"><div class="field-label">Unit</div><div class="field-value">${p.unitNumber}</div></div>
    ${p.billMonth ? `<div class="field"><div class="field-label">For Month</div><div class="field-value">${fmtMonth(p.billMonth)}</div></div>` : ""}
    ${p.transactionId ? `<div class="field"><div class="field-label">Transaction ID</div><div class="field-value" style="font-family:monospace;font-size:12px">${p.transactionId}</div></div>` : ""}
  </div>

  <div class="footer">
    <p>Generated by <strong>Makeja Homes</strong> Property Management System</p>
    <p style="margin-top:6px">${new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</p>
    <p style="margin-top:6px;color:#ccc">This is a system-generated receipt and requires no signature.</p>
  </div>
</body>
</html>`;
}

function downloadReceipt(p: Payment) {
  const html = generateReceiptHtml(p);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${p.referenceNumber || p.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TenantTransactionsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/tenant/payments/history");
      const data = await res.json();
      setPayments(data.payments || []);
      setTotalPaid(data.totalPaid || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const completed = payments.filter(p => ["COMPLETED", "VERIFIED"].includes(p.status));
  const pending   = payments.filter(p => p.status === "PENDING");
  const failed    = payments.filter(p => ["FAILED", "CANCELLED"].includes(p.status));

  const filtered = payments.filter(p => {
    if (filter === "COMPLETED" && !["COMPLETED", "VERIFIED"].includes(p.status)) return false;
    if (filter === "PENDING"   && p.status !== "PENDING") return false;
    if (filter === "FAILED"    && !["FAILED", "CANCELLED"].includes(p.status)) return false;
    if (filter === "DEPOSIT"   && p.paymentType !== "DEPOSIT") return false;
    if (filter === "RENT"      && p.paymentType !== "RENT") return false;
    if (search) {
      const q = search.toLowerCase();
      if (!( p.referenceNumber?.toLowerCase().includes(q)
          || p.paymentType?.toLowerCase().includes(q)
          || String(p.amount).includes(q)
      )) return false;
    }
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-gray-400 text-sm mt-0.5">Your full payment history with downloadable receipts</p>
        </div>
        <button onClick={load} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Total Paid</span>
          </div>
          <p className="text-xl font-bold text-white">{KES(totalPaid)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{completed.length} transaction{completed.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-xl font-bold text-white">{pending.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Awaiting verification</p>
        </div>
        <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">All Time</span>
          </div>
          <p className="text-xl font-bold text-white">{payments.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search reference, type…"
            className="w-full pl-9 pr-3 py-2 bg-gray-900/60 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500"
          />
        </div>
        {["ALL", "COMPLETED", "PENDING", "FAILED", "RENT", "DEPOSIT"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
              filter === f
                ? "bg-purple-600 border-purple-500 text-white"
                : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
            }`}
          >
            {f === "ALL" ? `All (${payments.length})` : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Receipt className="w-10 h-10 text-gray-700 mb-3" />
          <p className="text-gray-400 font-medium">No transactions found</p>
          <p className="text-gray-600 text-sm mt-1">Payments you make will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const statusCfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.PENDING;
            const StatusIcon = statusCfg.icon;
            const MethodIcon = METHOD_ICONS[p.paymentMethod] ?? DollarSign;
            const isExpanded = expandedId === p.id;
            const canDownload = ["COMPLETED", "VERIFIED"].includes(p.status);

            return (
              <div key={p.id} className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900/40 hover:border-gray-600 transition">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                >
                  {/* Method icon */}
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
                    <MethodIcon className="w-4 h-4 text-gray-400" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">
                        {PAYMENT_TYPE_LABELS[p.paymentType] || p.paymentType}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">
                      {fmtDate(p.paymentDate)}
                      {p.referenceNumber && ` · ${p.referenceNumber}`}
                    </p>
                  </div>

                  {/* Amount + chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-bold text-sm ${canDownload ? "text-green-400" : "text-white"}`}>
                      {KES(p.amount)}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-700/50 px-4 pb-4 pt-3 bg-black/20 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-gray-600 mb-0.5">Reference</p><p className="text-gray-300 font-mono">{p.referenceNumber || "—"}</p></div>
                      <div><p className="text-gray-600 mb-0.5">Method</p><p className="text-gray-300">{p.paymentMethod?.replace(/_/g, " ")}</p></div>
                      <div><p className="text-gray-600 mb-0.5">Date & Time</p><p className="text-gray-300">{fmtDateTime(p.paymentDate)}</p></div>
                      <div><p className="text-gray-600 mb-0.5">Property / Unit</p><p className="text-gray-300">{p.propertyName} · Unit {p.unitNumber}</p></div>
                      {p.billMonth && <div><p className="text-gray-600 mb-0.5">For Month</p><p className="text-gray-300">{fmtMonth(p.billMonth)}</p></div>}
                      {p.transactionId && <div><p className="text-gray-600 mb-0.5">Transaction ID</p><p className="text-gray-300 font-mono truncate">{p.transactionId}</p></div>}
                    </div>

                    {p.notes && (
                      <p className="text-xs text-gray-500 bg-gray-800/50 rounded-lg p-2.5 border border-gray-700/50">{p.notes}</p>
                    )}

                    {/* Download receipt */}
                    {canDownload ? (
                      <button
                        onClick={() => downloadReceipt(p)}
                        className="flex items-center gap-2 w-full justify-center py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-medium transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Receipt
                      </button>
                    ) : p.status === "PENDING" ? (
                      <div className="flex items-center gap-2 text-xs text-yellow-400/80 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-2.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        Pending verification by your property manager. Receipt available once approved.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
