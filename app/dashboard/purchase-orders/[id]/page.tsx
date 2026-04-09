"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ShoppingCart, MapPin, Calendar, Truck,
  CheckCircle, Clock, Ban, FileEdit, DollarSign,
  Package, User, FileText, AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_CONFIG = {
  DRAFT:     { label: "Draft",     color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/30" },
  PENDING:   { label: "Pending",   color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  APPROVED:  { label: "Approved",  color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30" },
  RECEIVED:  { label: "Received",  color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30" },
  CANCELLED: { label: "Cancelled", color: "text-red-400",    bg: "bg-red-500/10 border-red-500/30" },
} as const;

const NEXT_STATUS: Record<string, string> = {
  DRAFT:    "PENDING",
  PENDING:  "APPROVED",
  APPROVED: "RECEIVED",
};

const ACTION_LABELS: Record<string, string> = {
  DRAFT:    "Submit for Approval",
  PENDING:  "Approve Order",
  APPROVED: "Mark as Received",
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/purchase-orders/${id}`)
      .then(r => r.json())
      .then(d => { setOrder(d); setLoading(false); })
      .catch(() => { setError("Failed to load order"); setLoading(false); });
  }, [id]);

  const advanceStatus = async () => {
    if (!order || !NEXT_STATUS[order.status]) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: NEXT_STATUS[order.status] }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
      }
    } finally {
      setUpdating(false);
    }
  };

  const cancelOrder = async () => {
    if (!confirm("Cancel this purchase order?")) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
      }
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-xl bg-gray-800/40 animate-pulse" />
        <div className="h-64 rounded-2xl bg-gray-800/40 animate-pulse" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400 mb-4">{error || "Order not found"}</p>
        <Link href="/dashboard/purchase-orders" className="text-sm text-gray-400 hover:text-white underline">
          ← Back to Purchase Orders
        </Link>
      </div>
    );
  }

  const sta = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.DRAFT;
  const amount = Number(order.totalAmount ?? 0);
  const canAdvance = !!NEXT_STATUS[order.status];
  const canCancel = ["DRAFT", "PENDING", "APPROVED"].includes(order.status);

  const timeline = [
    { label: "Created",  done: true,                               date: order.createdAt },
    { label: "Pending",  done: ["PENDING","APPROVED","RECEIVED"].includes(order.status), date: order.status !== "DRAFT" ? order.updatedAt : null },
    { label: "Approved", done: ["APPROVED","RECEIVED"].includes(order.status),           date: null },
    { label: "Received", done: order.status === "RECEIVED",                              date: order.receivedDate },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/purchase-orders" className="p-2 rounded-xl border border-gray-800 text-gray-500 hover:text-white hover:border-gray-600 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <p className="text-xs font-mono text-gray-500">{order.orderNumber}</p>
          <h1 className="text-xl font-bold text-white">{order.supplier}</h1>
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${sta.bg} ${sta.color}`}>
          {sta.label}
        </span>
      </div>

      {/* Timeline */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Order Progress</p>
        <div className="flex items-center">
          {timeline.map((step, i) => (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${step.done ? "border-blue-500 bg-blue-500/20" : "border-gray-700 bg-gray-800/40"}`}>
                  {step.done
                    ? <CheckCircle className="w-4 h-4 text-blue-400" />
                    : <div className="w-2 h-2 rounded-full bg-gray-600" />}
                </div>
                <p className={`text-[10px] mt-1 font-medium ${step.done ? "text-blue-400" : "text-gray-600"}`}>{step.label}</p>
                {step.date && <p className="text-[9px] text-gray-700">{new Date(step.date).toLocaleDateString("en-KE")}</p>}
              </div>
              {i < timeline.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-5 ${timeline[i + 1].done ? "bg-blue-500/40" : "bg-gray-800"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Order info */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Order Details</p>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-400">Supplier:</span>
              <span className="text-white font-medium">{order.supplier}</span>
            </div>
            {order.properties?.name && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-400">Property:</span>
                <span className="text-white font-medium">{order.properties.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-400">Ordered:</span>
              <span className="text-white font-medium">{new Date(order.orderDate).toLocaleDateString("en-KE")}</span>
            </div>
            {order.expectedDelivery && (
              <div className="flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-400">Expected delivery:</span>
                <span className="text-white font-medium">{new Date(order.expectedDelivery).toLocaleDateString("en-KE")}</span>
              </div>
            )}
            {order.receivedDate && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-gray-400">Received:</span>
                <span className="text-green-400 font-medium">{new Date(order.receivedDate).toLocaleDateString("en-KE")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Amount + actions */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Amount</p>

          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Total order value</p>
            <p className="text-4xl font-black text-white">KES {amount.toLocaleString()}</p>
          </div>

          {order.notes && (
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Notes</p>
              <p className="text-sm text-gray-300 bg-gray-800/40 rounded-xl p-3">{order.notes}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2">
            {canAdvance && (
              <button
                onClick={advanceStatus}
                disabled={updating}
                className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                {updating ? "Updating..." : ACTION_LABELS[order.status]}
              </button>
            )}
            {canCancel && order.status !== "CANCELLED" && (
              <button
                onClick={cancelOrder}
                disabled={updating}
                className="flex items-center justify-center gap-2 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 text-sm font-medium rounded-xl transition-all"
              >
                <Ban className="w-4 h-4" />
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
