"use client";
import { useState, useEffect } from "react";
import NewMaintenanceClient from "./NewMaintenanceClient";

export const dynamic = 'force-dynamic';

export default function NewMaintenancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.ok ? r.json() : null),
      fetch("/api/properties/all").then(r => r.ok ? r.json() : { properties: [] }),
    ]).then(async ([me, allData]) => {
      if (!me) { setLoading(false); return; }

      const properties = (allData.properties ?? []).map((p: any) => ({ id: p.id, name: p.name }));
      const units = (allData.properties ?? []).flatMap((p: any) =>
        (p.units ?? []).map((u: any) => ({
          id: u.id,
          unitNumber: u.unitNumber,
          propertyId: p.id,
          propertyName: p.name,
        }))
      );

      // For tenants: look up their assigned unit via profile
      let tenantUnitId: string | null = null;
      if (me.role === "TENANT") {
        try {
          const profileRes = await fetch("/api/tenant/profile");
          if (profileRes.ok) {
            const profile = await profileRes.json();
            tenantUnitId = profile?.unitId ?? profile?.tenancy?.unitId ?? null;
          }
        } catch {}
      }

      setData({ me, properties, units, tenantUnitId });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return <div className="text-red-400 p-6">Failed to load data.</div>;

  return (
    <NewMaintenanceClient
      me={data.me}
      properties={data.properties}
      units={data.units}
      tenantUnitId={data.tenantUnitId}
    />
  );
}
