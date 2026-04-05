"use client";
import { useState, useEffect } from "react";
import NewMaintenanceClient from "../admin/maintenance/NewMaintenanceClient";

export const dynamic = 'force-dynamic';

export default function NewMaintenancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/properties/all").then(r => r.json()),
      fetch("/api/auth/me").then(r => r.ok ? r.json() : null),
    ]).then(([allData, me]) => {
      const properties = (allData.properties ?? []).map((p: any) => ({ id: p.id, name: p.name }));
      const units = (allData.properties ?? []).flatMap((p: any) =>
        (p.units ?? []).map((u: any) => ({ id: u.id, unitNumber: u.unitNumber, propertyId: p.id }))
      );
      setData({ properties, units });
      if (me?.id) setUserId(me.id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading...</div>;
  if (!data) return <div className="text-white p-6">Failed to load data.</div>;

  return <NewMaintenanceClient properties={data.properties} units={data.units} userId={userId} />;
}
