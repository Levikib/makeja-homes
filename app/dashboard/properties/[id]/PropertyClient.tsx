"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Plus, Archive } from "lucide-react";
import UnitsFilter from "./UnitsFilter";

interface Unit {
  id: string;
  unitNumber: string;
  type: string;
  status: string;
  rentAmount: number;
  depositAmount: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  floor: number | null;
  tenants: Array<{
    id: string;
    leaseEndDate: Date;
    users: {
      firstName: string;
      lastName: string;
    };
  }>;
}

interface PropertyClientProps {
  propertyId: string;
  units: Unit[];
  isArchived?: boolean;
}

interface FilterState {
  search: string;
  status: string;
  type: string;
  minRent: string;
  maxRent: string;
  bedrooms: string;
  bathrooms: string;
  floor: string;
  occupancy: string;
}

export default function PropertyClient({ propertyId, units, isArchived = false }: PropertyClientProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    type: "",
    minRent: "",
    maxRent: "",
    bedrooms: "",
    bathrooms: "",
    floor: "",
    occupancy: "",
  });

  const filteredUnits = units.filter((unit) => {
    if (filters.search && !unit.unitNumber.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.status && unit.status !== filters.status) {
      return false;
    }
    if (filters.type && unit.type !== filters.type) {
      return false;
    }
    if (filters.minRent && unit.rentAmount < parseFloat(filters.minRent)) {
      return false;
    }
    if (filters.maxRent && unit.rentAmount > parseFloat(filters.maxRent)) {
      return false;
    }
    if (filters.bedrooms) {
      const bedroomCount = parseInt(filters.bedrooms);
      if (bedroomCount === 4) {
        if (!unit.bedrooms || unit.bedrooms < 4) return false;
      } else {
        if (unit.bedrooms !== bedroomCount) return false;
      }
    }
    if (filters.bathrooms) {
      const bathroomCount = parseFloat(filters.bathrooms);
      if (bathroomCount === 3) {
        if (!unit.bathrooms || unit.bathrooms < 3) return false;
      } else {
        if (unit.bathrooms !== bathroomCount) return false;
      }
    }
    if (filters.floor && unit.floor !== parseInt(filters.floor)) {
      return false;
    }
    if (filters.occupancy) {
      const hasActiveTenant = unit.tenants.length > 0;
      if (filters.occupancy === "occupied" && !hasActiveTenant) return false;
      if (filters.occupancy === "vacant" && hasActiveTenant) return false;
    }
    return true;
  });

  // Calculate reactive stats from filtered units
  const stats = {
    total: filteredUnits.length,
    occupied: filteredUnits.filter(u => u.status === "OCCUPIED").length,
    vacant: filteredUnits.filter(u => u.status === "VACANT").length,
    maintenance: filteredUnits.filter(u => u.status === "MAINTENANCE").length,
    reserved: filteredUnits.filter(u => u.status === "RESERVED").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OCCUPIED":
        return "border-green-500/50 bg-green-500/10 text-green-400";
      case "VACANT":
        return "border-blue-500/50 bg-blue-500/10 text-blue-400";
      case "MAINTENANCE":
        return "border-yellow-500/50 bg-yellow-500/10 text-yellow-400";
      case "RESERVED":
        return "border-purple-500/50 bg-purple-500/10 text-purple-400";
      default:
        return "border-gray-500/50 bg-gray-500/10 text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards - Reactive to Filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Units</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Occupied</p>
          <p className="text-3xl font-bold text-white">{stats.occupied}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Vacant</p>
          <p className="text-3xl font-bold text-white">{stats.vacant}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Maintenance</p>
          <p className="text-3xl font-bold text-white">{stats.maintenance}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Reserved</p>
          <p className="text-3xl font-bold text-white">{stats.reserved}</p>
        </div>
      </div>

      <UnitsFilter filters={filters} setFilters={setFilters} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUnits.map((unit) => (
          <div
            key={unit.id}
            className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Unit {unit.unitNumber}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(unit.status)}`}>
                  {unit.status}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Type</span>
                <span className="text-white">{unit.type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Rent</span>
                <span className="text-white font-semibold">KSH {unit.rentAmount.toLocaleString()}</span>
              </div>
              {unit.bedrooms !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Bedrooms</span>
                  <span className="text-white">{unit.bedrooms}</span>
                </div>
              )}
              {unit.bathrooms !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Bathrooms</span>
                  <span className="text-white">{unit.bathrooms}</span>
                </div>
              )}
            </div>

            {/* Buttons - Perfectly Aligned */}
            <div className="flex gap-2">
              <Link href={`/dashboard/properties/${propertyId}/units/${unit.id}`} className="flex-1">
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span className="font-medium">View</span>
                </button>
              </Link>
              
              {!isArchived && (
                <>
                  {unit.status === "VACANT" ? (
                    <Link href={`/dashboard/properties/${propertyId}/units/${unit.id}/assign-tenant`} className="flex-1">
                      <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" />
                        <span className="font-medium">Assign</span>
                      </button>
                    </Link>
                  ) : (
                    <Link href={`/dashboard/properties/${propertyId}/units/${unit.id}/edit`} className="flex-1">
                      <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2">
                        <Edit className="w-4 h-4" />
                        <span className="font-medium">Edit</span>
                      </button>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
