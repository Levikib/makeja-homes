"use client";
import { useState, useEffect } from "react";
import MaintenanceForm from "@/components/maintenance/maintenance-form";

export const dynamic = 'force-dynamic';

export default function TenantNewMaintenancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.ok ? r.json() : null),
      fetch("/api/properties/all").then(r => r.json()),
    ]).then(([me, allData]) => {
      const properties = (allData.properties ?? []).map((p: any) => ({ id: p.id, name: p.name }));
      const units = (allData.properties ?? []).flatMap((p: any) =>
        (p.units ?? []).map((u: any) => ({ id: u.id, unitNumber: u.unitNumber, propertyId: p.id }))
      );
      setData({ properties, units, userId: me?.id ?? "" });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading...</div>;
  if (!data) return <div className="text-white p-6">Failed to load.</div>;

  return <MaintenanceForm mode="create" properties={data.properties} units={data.units} userId={data.userId} />;
}
