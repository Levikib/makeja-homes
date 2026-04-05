"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
      setData({
        orders: Array.isArray(orders) ? orders : [],
        properties: Array.isArray(propsData) ? propsData : (propsData.properties ?? []),
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading purchase orders...</div>;
  if (!data) return <div className="text-white p-6">Failed to load.</div>;

  return <PurchaseOrdersClient orders={data.orders} properties={data.properties} />;
}
