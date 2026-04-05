"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Plus, Archive } from "lucide-react";
import PropertyClient from "./PropertyClient";

export const dynamic = 'force-dynamic';

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => { setProperty(data); setLoading(false); })
      .catch(() => { setLoading(false); router.push("/dashboard/admin/properties"); });
  }, [id]);

  if (loading) {
    return <div className="text-white p-6">Loading property...</div>;
  }

  if (!property) {
    return <div className="text-white p-6">Property not found.</div>;
  }

  const isArchived = !!property.deletedAt;
  const units = property.units ?? [];

  // Calculate stats
  const occupiedUnits = units.filter((u: any) => u.status === "OCCUPIED");
  const totalRent = occupiedUnits.reduce((sum: number, u: any) => sum + (u.rentAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/properties">
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{property.name}</h1>
              {isArchived && (
                <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-full border border-red-500/30 flex items-center gap-2">
                  <Archive className="w-4 h-4" />
                  Archived
                </span>
              )}
            </div>
            <p className="text-gray-400">{property.address}</p>
          </div>
        </div>
        {!isArchived && (
          <div className="flex gap-3">
            <Link href={`/dashboard/properties/${id}/units/new`}>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Unit
              </Button>
            </Link>
            <Link href={`/dashboard/admin/properties/${id}/edit`}>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Edit className="w-4 h-4 mr-2" />
                Edit Property
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Archived Warning Banner */}
      {isArchived && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Archive className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-yellow-400 font-semibold">Archived Property</h3>
              <p className="text-gray-300 text-sm mt-1">
                This property is archived and shown for reference only. Restore the property to make changes or add new units.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Card */}
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-green-400 mb-2">Monthly Revenue</h3>
        <p className="text-4xl font-bold text-white">KSH {totalRent.toLocaleString()}</p>
        <p className="text-gray-400 text-sm mt-1">From {occupiedUnits.length} occupied units</p>
      </div>

      {/* Units List */}
      <PropertyClient propertyId={id} units={units} isArchived={isArchived} />
    </div>
  );
}
