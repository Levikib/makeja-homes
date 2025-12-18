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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OCCUPIED":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "VACANT":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "MAINTENANCE":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="space-y-6">
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

            <div className="space-y-2 mb-4 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="text-white">{unit.type}</span>
              </div>
              <div className="flex justify-between">
                <span>Rent:</span>
                <span className="text-white">KSH {unit.rentAmount.toLocaleString()}</span>
              </div>
              {unit.bedrooms && (
                <div className="flex justify-between">
                  <span>Bedrooms:</span>
                  <span className="text-white">{unit.bedrooms}</span>
                </div>
              )}
              {unit.tenants.length > 0 && (
                <div className="flex justify-between">
                  <span>Tenant:</span>
                  <span className="text-white">
                    {unit.tenants[0].users.firstName} {unit.tenants[0].users.lastName}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Link href={`/dashboard/properties/${propertyId}/units/${unit.id}`} className="flex-1">
                <Button variant="outline" className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
              </Link>

              {!isArchived && (
                <>
                  <Link href={`/dashboard/properties/${propertyId}/units/${unit.id}/edit`}>
                    <Button variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </Link>

                  {unit.status === "VACANT" && (
                    <Link href={`/dashboard/properties/${propertyId}/units/${unit.id}/assign-tenant`}>
                      <Button variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                        <Plus className="w-4 h-4 mr-2" />
                        Assign
                      </Button>
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
