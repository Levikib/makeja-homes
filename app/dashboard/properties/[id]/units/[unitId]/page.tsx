"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import UnitDetailsClient from "./UnitDetailsClient";

export const dynamic = 'force-dynamic';

export default function UnitDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const unitId = params.unitId as string;

  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/properties/${id}/units/${unitId}`)
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => {
        const now = new Date();
        const isArchived = !!data.properties?.deletedAt;

        // Shape the data to match what UnitDetailsClient expects
        const allTenants: any[] = data.tenants ?? [];
        const sorted = [...allTenants].sort((a, b) =>
          new Date(b.leaseStartDate).getTime() - new Date(a.leaseStartDate).getTime()
        );

        let currentTenant: any = null;
        let historicalTenants = sorted;

        if (!isArchived) {
          const valid = sorted.filter(t => new Date(t.leaseEndDate) >= now);
          currentTenant = valid[0] ?? null;
          historicalTenants = sorted.filter(t => !currentTenant || t.id !== currentTenant.id);
        }

        setUnit({
          id: data.id,
          unitNumber: data.unitNumber,
          type: data.type,
          status: data.status,
          floor: data.floor,
          rentAmount: data.rentAmount,
          depositAmount: data.depositAmount,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          squareFeet: data.squareFeet,
          properties: data.properties,
          currentTenant,
          historicalTenants,
          isArchived,
        });
        setLoading(false);
      })
      .catch(() => { setLoading(false); router.push(`/dashboard/properties/${id}`); });
  }, [id, unitId]);

  if (loading) return <div className="text-white p-6">Loading unit...</div>;
  if (!unit) return null;

  return <UnitDetailsClient unit={unit} />;
}
