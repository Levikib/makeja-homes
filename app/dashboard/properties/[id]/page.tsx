"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Home,
  MapPin,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Users,
  DollarSign,
  Calendar,
  Zap,
  Filter,
} from "lucide-react";

interface Unit {
  id: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  rentAmount: number;
  status: string;
  tenant?: {
    firstName: string;
    lastName: string;
  };
}

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  description: string | null;
  units: Unit[];
}

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    if (params.id) {
      fetchProperty();
    }
  }, [params.id]);

  const fetchProperty = async () => {
    try {
      const response = await fetch(`/api/properties/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setProperty(data);
      } else {
        router.push("/dashboard/properties");
      }
    } catch (error) {
      console.error("Failed to fetch property:", error);
    } finally {
      setLoading(false);
    }
  };

const filteredUnits = property?.units?.filter((unit) => {
    if (statusFilter === "ALL") return true;
    return unit.status === statusFilter;
  }) || [];

  const stats = {
    total: property?.units?.length || 0,
    occupied: property?.units?.filter((u) => u.status === "OCCUPIED").length || 0,
    vacant: property?.units?.filter((u) => u.status === "VACANT").length || 0,
    totalRevenue: property?.units
      ?.filter((u) => u.status === "OCCUPIED")
      .reduce((sum, u) => sum + Number(u.rentAmount), 0) || 0,
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner">
          <Zap className="h-12 w-12 text-purple-500 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!property) {
    return null;
  }

  return (
    <div className="space-y-8 p-8 min-h-screen relative">
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/properties"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Properties</span>
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-5xl font-bold gradient-text mb-2 flex items-center gap-3">
                <Building2 className="h-12 w-12 text-purple-500 animate-pulse" />
                {property.name}
              </h1>
              <div className="flex items-center gap-2 text-gray-400 text-lg">
                <MapPin className="h-5 w-5" />
                <span>{property.address}</span>
              </div>
              <div className="mt-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {property.type}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href={`/dashboard/properties/${property.id}/edit`}>
                <button className="px-4 py-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 hover:scale-105 transition-all flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <Home className="h-8 w-8 text-purple-400" />
              <span className="text-3xl font-bold text-white">{stats.total}</span>
            </div>
            <p className="text-gray-400 text-sm">Total Units</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-green-400" />
              <span className="text-3xl font-bold text-green-400">{stats.occupied}</span>
            </div>
            <p className="text-gray-400 text-sm">Occupied</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <Home className="h-8 w-8 text-orange-400" />
              <span className="text-3xl font-bold text-orange-400">{stats.vacant}</span>
            </div>
            <p className="text-gray-400 text-sm">Vacant</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-emerald-400" />
              <span className="text-2xl font-bold text-emerald-400">
                KSH {stats.totalRevenue.toLocaleString('en-US')}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Monthly Revenue</p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Filter className="h-5 w-5 text-purple-400" />
              <div className="flex gap-2">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    statusFilter === "ALL"
                      ? "bg-purple-500 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  All ({stats.total})
                </button>
                <button
                  onClick={() => setStatusFilter("OCCUPIED")}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    statusFilter === "OCCUPIED"
                      ? "bg-green-500 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  Occupied ({stats.occupied})
                </button>
                <button
                  onClick={() => setStatusFilter("VACANT")}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    statusFilter === "VACANT"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  Vacant ({stats.vacant})
                </button>
              </div>
            </div>
            <Link href={`/dashboard/properties/${property.id}/units/new`}>
              <button className="px-4 py-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Add Unit</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Units Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.map((unit, index) => (
            <Link key={unit.id} href={`/dashboard/units/${unit.id}`}>
              <div
                className="glass-card p-6 hover:scale-105 transition-all cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                    <Home className="h-8 w-8 text-purple-400" />
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      unit.status === "OCCUPIED"
                        ? "bg-green-500/20 text-green-300 border-green-500/30"
                        : "bg-orange-500/20 text-orange-300 border-orange-500/30"
                    }`}
                  >
                    {unit.status}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">
                  Unit {unit.unitNumber}
                </h3>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Bedrooms</span>
                    <span className="text-white font-medium">{unit.bedrooms}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Bathrooms</span>
                    <span className="text-white font-medium">{unit.bathrooms}</span>
                  </div>
                  {unit.squareFeet && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Square Feet</span>
                      <span className="text-white font-medium">{unit.squareFeet}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Monthly Rent</span>
                    <span className="text-xl font-bold text-emerald-400">
                      KSH {Number(unit.rentAmount).toLocaleString('en-US')}
                    </span>
                  </div>
                  {unit.tenant && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-300">
                      <Users className="h-4 w-4 text-green-400" />
                      <span>
                        {unit.tenant.firstName} {unit.tenant.lastName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredUnits.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Home className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">
              No units found
            </h3>
            <p className="text-gray-500 mb-6">
              {statusFilter !== "ALL"
                ? `No ${statusFilter.toLowerCase()} units`
                : "Add your first unit to this property"}
            </p>
            <Link href={`/dashboard/properties/${property.id}/units/new`}>
              <button className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all inline-flex items-center gap-2">
                <Plus className="h-5 w-5" />
                <span>Add Unit</span>
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
