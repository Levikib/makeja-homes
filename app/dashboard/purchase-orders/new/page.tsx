"use client";
import { useState, useEffect } from "react";
import NewPurchaseOrderClient from "./NewPurchaseOrderClient";

export const dynamic = 'force-dynamic';

export default function NewPurchaseOrderPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/properties").then(r => r.json()),
      fetch("/api/inventory").then(r => r.json()),
    ]).then(([propsData, invData]) => {
      setData({
        properties: Array.isArray(propsData) ? propsData : (propsData.properties ?? []),
        inventoryItems: Array.isArray(invData) ? invData : [],
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading...</div>;
  if (!data) return <div className="text-white p-6">Failed to load.</div>;

  return <NewPurchaseOrderClient properties={data.properties} inventoryItems={data.inventoryItems} />;
}
