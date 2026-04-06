"use client";
import { useState, useEffect } from "react";
import PurchaseOrdersClient from "./PurchaseOrdersClient";

export const dynamic = 'force-dynamic';

export default function PurchaseOrdersPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/purchase-orders").then(r => r.json()),
      fetch("/api/properties").then(r => r.json()),
    ]).then(([orders, propsData]) => {
      const orderList = Array.isArray(orders) ? orders : [];
      const stats = {
        totalOrders: orderList.length,
        pendingCount: orderList.filter((o: any) => o.status === "PENDING").length,
        approvedCount: orderList.filter((o: any) => o.status === "APPROVED").length,
        receivedCount: orderList.filter((o: any) => o.status === "RECEIVED").length,
        totalValue: orderList.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0),
      };
      setData({
        orders: orderList,
        properties: Array.isArray(propsData) ? propsData : (propsData.properties ?? []),
        stats,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading purchase orders...</div>;
  if (!data) return <div className="text-white p-6">Failed to load.</div>;

  return <PurchaseOrdersClient orders={data.orders} properties={data.properties} stats={data.stats} />;
}
