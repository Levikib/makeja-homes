"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  MapPin, Phone, Mail, User, Pencil, Trash2, Plus,
  Home, DollarSign, Users
} from "lucide-react";
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
  tenants?: Array<{
    users: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
    };
  }>;
}

interface Property {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  description: string | null;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  caretaker: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  } | null;
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

export default function PropertyDetailsClient({ propertyId }: { propertyId: string }) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetch(`/api/properties/${propertyId}/details`)
      .then((res) => res.json())
      .then((data) => {
        setProperty(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching property:", error);
        setLoading(false);
      });
  }, [propertyId]);

  if (loading) {
    return <div className="text-white">Loading...</div>;
  }

  if (!property) {
    return <div className="text-white">Property not found</div>;
  }

  // Filter units based on all filter criteria
  const filteredUnits = property.units.filter((unit) => {
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
    <div className="space-y-6">
      {/* Property Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{property.name}</h1>
            <div className="flex flex-wrap gap-4 text-gray-400">
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>{property.address}, {property.city}</span>
              </div>
              <div className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-400 text-sm">
                {property.type}
              </div>
            </div>
          </div>
          <Link href={`/dashboard/properties/${property.id}/edit`}>
            <Button variant="outline" className="border-gray-600 text-gray-300">
              <Pencil className="w-4 h-4 mr-2" />
              Edit Property
            </Button>
          </Link>
        </div>

        {/* Staff Info */}
        {(property.manager || property.caretaker) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-700">
            {property.manager && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-purple-400 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Property Manager</p>
                  <p className="text-white font-semibold">
                    {property.manager.firstName} {property.manager.lastName}
                  </p>
                  <p className="text-gray-400 text-sm">{property.manager.email}</p>
                </div>
              </div>
            )}
            {property.caretaker && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-blue-400 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Caretaker</p>
                  <p className="text-white font-semibold">
                    {property.caretaker.firstName} {property.caretaker.lastName}
                  </p>
                  <p className="text-gray-400 text-sm">{property.caretaker.email}</p>
                  {property.caretaker.phoneNumber && (
                    <p className="text-gray-400 text-sm">{property.caretaker.phoneNumber}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6">
          <Home className="w-8 h-8 text-cyan-400 mb-2" />
          <p className="text-gray-400 text-sm">Total Units</p>
          <p className="text-3xl font-bold text-white">{property.units.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6">
          <Users className="w-8 h-8 text-green-400 mb-2" />
          <p className="text-gray-400 text-sm">Occupied</p>
          <p className="text-3xl font-bold text-white">
            {property.units.filter(u => u.tenants && u.tenants.length > 0).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-6">
          <DollarSign className="w-8 h-8 text-purple-400 mb-2" />
          <p className="text-gray-400 text-sm">Avg. Rent</p>
          <p className="text-3xl font-bold text-white">
            KSH {Math.round(property.units.reduce((sum, u) => sum + u.rentAmount, 0) / property.units.length).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter Component */}
      <UnitsFilter
        onFilterChange={setFilters}
        totalUnits={property.units.length}
        filteredCount={filteredUnits.length}
      />

      {/* Units Grid */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Units</h2>
        <Link href={`/dashboard/properties/${property.id}/units/new`}>
          <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Unit
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUnits.map((unit) => (
          <div
            key={unit.id}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-cyan-500/50 transition-all"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Unit {unit.unitNumber}</h3>
                <p className="text-sm text-gray-400">{unit.type.replace(/_/g, ' ')}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                unit.status === 'OCCUPIED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                unit.status === 'VACANT' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                unit.status === 'MAINTENANCE' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              }`}>
                {unit.status}
              </span>
            </div>

            <div className="space-y-2 mb-4 text-sm">
              {unit.bedrooms !== null && (
                <div className="flex justify-between text-gray-400">
                  <span>Bedrooms:</span>
                  <span className="text-white">{unit.bedrooms}</span>
                </div>
              )}
              {unit.bathrooms !== null && (
                <div className="flex justify-between text-gray-400">
                  <span>Bathrooms:</span>
                  <span className="text-white">{unit.bathrooms}</span>
                </div>
              )}
              {unit.squareFeet !== null && (
                <div className="flex justify-between text-gray-400">
                  <span>Sq Ft:</span>
                  <span className="text-white">{unit.squareFeet}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-400 pt-2 border-t border-gray-700">
                <span>Rent:</span>
                <span className="text-green-400 font-semibold">KSH {unit.rentAmount.toLocaleString()}</span>
              </div>
            </div>

            {unit.tenants && unit.tenants.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 mb-3 text-sm">
                <p className="text-green-400 font-semibold">
                  {unit.tenants[0].users.firstName} {unit.tenants[0].users.lastName}
                </p>
                <p className="text-gray-400 text-xs">{unit.tenants[0].users.email}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Link href={`/dashboard/properties/${property.id}/units/${unit.id}/edit`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredUnits.length === 0 && (
        <div className="text-center py-12 bg-gray-800/30 border border-gray-700 rounded-xl">
          <Home className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No units match your filters</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filter criteria</p>
          <Button onClick={() => setFilters({
            search: "", status: "", type: "", minRent: "", maxRent: "",
            bedrooms: "", bathrooms: "", floor: "", occupancy: ""
          })} variant="outline" className="border-gray-600 text-gray-300">
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}
