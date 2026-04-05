"use client";
import { useState, useEffect } from "react";
import TenantsClient from "./TenantsClient";

export const dynamic = 'force-dynamic';

export default function TenantsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/tenants").then(r => r.json()),
      fetch("/api/properties").then(r => r.json()),
    ]).then(([tenantsData, propsData]) => {
      setData({
        tenants: Array.isArray(tenantsData) ? tenantsData : (tenantsData.tenants ?? []),
        properties: Array.isArray(propsData) ? propsData : (propsData.properties ?? []),
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading tenants...</div>;
  if (!data) return <div className="text-white p-6">Failed to load tenants.</div>;

  return <TenantsClient tenants={data.tenants} properties={data.properties} />;
}
