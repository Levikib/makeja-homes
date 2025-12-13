"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Plus } from "lucide-react";
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

export default function PropertyClient({ propertyId, units }: PropertyClientProps) {
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

  // Filter units based on all criteria
  const filteredUnits = units.filter((unit) => {
    // Search filter
    if (filters.search && !unit.unitNumber.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    // Status filter
    if (filters.status && unit.status !== filters.status) {
      return false;
    }

    // Type filter
    if (filters.type && unit.type !== filters.type) {
      return false;
    }

    // Rent range filter
    if (filters.minRent && unit.rentAmount < parseFloat(filters.minRent)) {
      return false;
    }
    if (filters.maxRent && unit.rentAmount > parseFloat(filters.maxRent)) {
      return false;
    }

    // Bedrooms filter
    if (filters.bedrooms) {
      const bedroomCount = parseInt(filters.bedrooms);
      if (bedroomCount === 4) {
        if (!unit.bedrooms || unit.bedrooms < 4) return false;
      } else {
        if (unit.bedrooms !== bedroomCount) return false;
      }
    }

    // Bathrooms filter
    if (filters.bathrooms) {
      const bathroomCount = parseFloat(filters.bathrooms);
      if (bathroomCount === 3) {
        if (!unit.bathrooms || unit.bathrooms < 3) return false;
      } else {
        if (unit.bathrooms !== bathroomCount) return false;
      }
    }

    // Floor filter
    if (filters.floor && unit.floor !== parseInt(filters.floor)) {
      return false;
    }

    // Occupancy filter
    if (filters.occupancy) {
      const hasTenant = unit.tenants && unit.tenants.length > 0;
      if (filters.occupancy === "with-tenant" && !hasTenant) return false;
      if (filters.occupancy === "without-tenant" && hasTenant) return false;
    }

    return true;
  });

  return (
    <>
      {/* Filter Component */}
      <UnitsFilter
        onFilterChange={setFilters}
        totalUnits={units.length}
        filteredCount={filteredUnits.length}
      />

      {/* Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUnits.map((unit) => {
          return (
            <div
              key={unit.id}
              className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse" />
              </div>

              <div className="relative">
                {/* Status Indicator */}
                <div className="absolute top-0 right-0">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      unit.status === "VACANT"
                        ? "bg-blue-400 animate-pulse shadow-lg shadow-blue-400/50"
                        : unit.status === "OCCUPIED"
                        ? "bg-green-400 animate-pulse shadow-lg shadow-green-400/50"
                        : "bg-orange-400"
                    }`}
                  />
                </div>

                {/* Unit Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2">Unit {unit.unitNumber}</h3>
                  <div className="flex gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        unit.status === "VACANT"
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                          : unit.status === "OCCUPIED"
                          ? "bg-green-500/20 text-green-400 border border-green-500/40"
                          : "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                      }`}
                    >
                      {unit.status}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/40">
                      {unit.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Unit Details */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-gray-400 text-xs">Type</p>
                    <p className="text-white text-sm font-medium">{unit.type.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Rent</p>
                    <p className="text-green-400 font-bold text-sm">
                      KSH {unit.rentAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Bedrooms</p>
                    <p className="text-white text-sm">{unit.bedrooms ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Bathrooms</p>
                    <p className="text-white text-sm">{unit.bathrooms ?? "-"}</p>
                  </div>
                </div>

                {/* Tenant Info if Occupied */}
                {unit.tenants && unit.tenants.length > 0 && (
                  <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Current Tenant</p>
                    <p className="text-sm text-green-400 font-semibold">
                      {unit.tenants[0].users.firstName} {unit.tenants[0].users.lastName}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/dashboard/properties/${propertyId}/units/${unit.id}`}
                    className="w-full"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </Link>
                  <Link
                    href={`/dashboard/properties/${propertyId}/units/${unit.id}/edit`}
                    className="w-full"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-500/20"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* No Results Message */}
      {filteredUnits.length === 0 && (
        <div className="text-center py-12 bg-gray-800/30 border border-gray-700 rounded-xl">
          <p className="text-xl font-semibold text-gray-400 mb-2">No units match your filters</p>
          <p className="text-gray-500 mb-4">Try adjusting your filter criteria</p>
        </div>
      )}

      {/* Add New Unit Button */}
      <div className="flex justify-center mt-6">
        <Link href={`/dashboard/properties/${propertyId}/units/new`}>
          <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add New Unit
          </Button>
        </Link>
      </div>
    </>
  );
}
