"use client";
import { useState, useEffect } from "react";
import NewLeaseClient from "./NewLeaseClient";

export const dynamic = 'force-dynamic';

export default function NewLeasePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/properties").then(r => r.json()),
      fetch("/api/properties/all").then(r => r.json()),
    ]).then(([propsData, allData]) => {
      const properties = (Array.isArray(propsData) ? propsData : (propsData.properties ?? [])).map((p: any) => ({
        id: p.id,
        name: p.name,
        location: p.city || p.address || "N/A",
      }));
      const units = (allData.properties ?? []).flatMap((p: any) =>
        (p.units ?? []).filter((u: any) => u.status === "VACANT").map((u: any) => ({
          ...u,
          properties: { id: p.id, name: p.name },
          tenants: [],
        }))
      );
      setData({ properties, units });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading...</div>;
  if (!data) return <div className="text-white p-6">Failed to load data.</div>;

  return <NewLeaseClient properties={data.properties} units={data.units} />;
}
