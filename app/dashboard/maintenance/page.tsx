"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import MaintenanceClient from "./MaintenanceClient";

export const dynamic = "force-dynamic";

export default function MaintenancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([
      fetch("/api/maintenance").then((r) => r.json()),
      fetch("/api/properties").then((r) => r.json()),
    ])
      .then(([mData, propsData]) => {
        setData({
          requests: mData.requests ?? [],
          stats: mData.stats ?? { openCount: 0, inProgressCount: 0, completedCount: 0, urgentCount: 0, totalCost: 0 },
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
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-orange-400" />
            Maintenance
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Track, assign and resolve property maintenance requests</p>
        </div>
        <Link
          href="/dashboard/maintenance/new"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-orange-900/30"
        >
          <Plus className="w-4 h-4" />
          New Request
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-800/40 animate-pulse" />
          ))}
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <p className="text-red-400">Failed to load maintenance data.</p>
        </div>
      ) : (
        <MaintenanceClient
          requests={data.requests}
          properties={data.properties}
          stats={data.stats}
          onRefresh={() => load(true)}
        />
      )}
    </div>
  );
}
