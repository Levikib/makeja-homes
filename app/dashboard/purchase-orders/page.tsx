"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import PurchaseOrdersClient from "./PurchaseOrdersClient";

export const dynamic = "force-dynamic";

export default function PurchaseOrdersPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([
      fetch("/api/purchase-orders").then((r) => r.json()),
      fetch("/api/properties").then((r) => r.json()),
    ])
      .then(([orders, propsData]) => {
        const orderList = Array.isArray(orders) ? orders : [];
        const stats = {
          totalOrders: orderList.length,
          draftCount:    orderList.filter((o: any) => o.status === "DRAFT").length,
          pendingCount:  orderList.filter((o: any) => o.status === "PENDING").length,
          approvedCount: orderList.filter((o: any) => o.status === "APPROVED").length,
          receivedCount: orderList.filter((o: any) => o.status === "RECEIVED").length,
          cancelledCount:orderList.filter((o: any) => o.status === "CANCELLED").length,
          totalValue:    orderList.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0),
          pendingValue:  orderList.filter((o: any) => ["PENDING","APPROVED"].includes(o.status)).reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0),
        };
        setData({
          orders: orderList,
          properties: Array.isArray(propsData) ? propsData : (propsData.properties ?? []),
          stats,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-400" />
            Purchase Orders
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage procurement, approve orders and track deliveries</p>
        </div>
        <Link
          href="/dashboard/purchase-orders/new"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/30"
        >
          <span className="text-lg leading-none">+</span>
          New Order
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-800/40 animate-pulse" />
          ))}
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <p className="text-red-400">Failed to load purchase orders.</p>
        </div>
      ) : (
        <PurchaseOrdersClient orders={data.orders} properties={data.properties} stats={data.stats} onRefresh={() => load(true)} />
      )}
    </div>
  );
}
