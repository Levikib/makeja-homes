"use client";
import { useState, useEffect } from "react";
import LeasesClient from "./LeasesClient";

export const dynamic = 'force-dynamic';

export default function LeasesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/leases").then(r => r.json()),
      fetch("/api/properties").then(r => r.json()),
    ]).then(([leasesData, propsData]) => {
      setData({
        leases: Array.isArray(leasesData) ? leasesData : [],
        properties: Array.isArray(propsData) ? propsData : (propsData.properties ?? []),
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading leases...</div>;
  if (!data) return <div className="text-white p-6">Failed to load leases.</div>;

  return <LeasesClient leases={data.leases} properties={data.properties} />;
}
