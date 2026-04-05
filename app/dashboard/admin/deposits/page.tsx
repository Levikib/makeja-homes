"use client";
import { useState, useEffect } from "react";
import DepositsClient from "./DepositsClient";

export const dynamic = 'force-dynamic';

export default function DepositsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/tenants").then(r => r.json()),
      fetch("/api/properties").then(r => r.json()),
    ]).then(([tenantsData, propsData]) => {
      const tenants = Array.isArray(tenantsData) ? tenantsData : (tenantsData.tenants ?? []);
      const properties = Array.isArray(propsData) ? propsData : (propsData.properties ?? []);

      const totalDeposits = tenants.reduce((s: number, t: any) => s + (t.depositAmount || 0), 0);
      const activeCount = tenants.filter((t: any) => t.users?.isActive).length;

      setData({
        tenants,
        properties,
        stats: {
          totalDeposits,
          activeCount,
          refundsIssued: 0,
          refundsCount: 0,
          damagesDeducted: 0,
          damagesCount: 0,
          pendingRefunds: 0,
        },
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading deposits...</div>;
  if (!data) return <div className="text-white p-6">Failed to load deposits.</div>;

  return <DepositsClient tenants={data.tenants} properties={data.properties} stats={data.stats} />;
}
