"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import UnitForm from "@/components/units/unit-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function EditUnitPage() {
  const params = useParams();
  const router = useRouter();
  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to find which property this unit belongs to via units API
    fetch(`/api/units/${params.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { router.push("/dashboard/admin/properties"); return; }
        setUnit(data);
        setLoading(false);
      })
      .catch(() => { setLoading(false); router.push("/dashboard/admin/properties"); });
  }, [params.id]);

  if (loading) return <div className="text-white p-6">Loading unit...</div>;
  if (!unit) return null;

  const propertyId = unit.propertyId || unit.properties?.id;

  return (
    <div className="space-y-6 p-8">
      <div>
        <Link
          href={`/dashboard/properties/${propertyId}`}
          className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Property
        </Link>
        <h1 className="text-3xl font-bold text-white">
          Edit Unit {unit.unitNumber}
        </h1>
        <p className="text-gray-400 mt-1">
          Update unit details for {unit.properties?.name}
        </p>
      </div>
      <UnitForm unit={unit} mode="edit" propertyId={propertyId} />
    </div>
  );
}
