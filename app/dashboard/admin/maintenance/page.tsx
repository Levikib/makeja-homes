"use client";
import { useState, useEffect } from "react";
import MaintenanceClient from "./MaintenanceClient";

export const dynamic = 'force-dynamic';

export default function MaintenancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/maintenance").then(r => r.json()),
      fetch("/api/properties").then(r => r.json()),
    ]).then(([mData, propsData]) => {
      setData({
        requests: mData.requests ?? [],
        stats: mData.stats ?? { openCount: 0, inProgressCount: 0, completedCount: 0, totalCost: 0 },
        properties: Array.isArray(propsData) ? propsData : (propsData.properties ?? []),
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading maintenance...</div>;
  if (!data) return <div className="text-white p-6">Failed to load maintenance.</div>;

  return <MaintenanceClient requests={data.requests} properties={data.properties} stats={data.stats} />;
}
