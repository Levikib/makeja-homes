"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, Package } from "lucide-react";
import InventoryClient from "./InventoryClient";

export const dynamic = "force-dynamic";

export default function InventoryPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/properties").then((r) => r.json()),
    ])
      .then(([items, propsData]) => {
        setData({
          items: Array.isArray(items) ? items : [],
          properties: Array.isArray(propsData) ? propsData : (propsData.properties ?? []),
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
            <Package className="w-6 h-6 text-emerald-400" />
            Inventory
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage stock levels, track assets and purchase supplies</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/purchase-orders/new"
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white text-sm font-medium rounded-xl transition-all"
          >
            Purchase Order
          </Link>
          <Link
            href="/dashboard/inventory/new"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/30"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-800/40 animate-pulse" />
          ))}
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <p className="text-red-400">Failed to load inventory.</p>
        </div>
      ) : (
        <InventoryClient items={data.items} properties={data.properties} onRefresh={() => load(true)} />
      )}
    </div>
  );
}

