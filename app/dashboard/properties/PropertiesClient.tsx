"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Users,
  Home,
  Plus,
  Search,
  MapPin,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  X,
} from "lucide-react";

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  totalUnits?: number;
  occupiedUnits?: number;
  totalMonthlyRent?: number;
  description: string | null;
  createdAt: string;
}

export default function PropertiesClient() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    filterProperties();
  }, [searchQuery, typeFilter, properties]);

  const fetchProperties = async () => {
    try {
      const response = await fetch("/api/properties");
      if (response.ok) {
        const data = await response.json();
        setProperties(data);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProperties = () => {
    let filtered = properties;

    if (searchQuery) {
      filtered = filtered.filter(
        (prop) =>
          prop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prop.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((prop) => prop.type === typeFilter);
    }

    setFilteredProperties(filtered);
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return;

    try {
      const response = await fetch(`/api/properties/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchProperties();
      }
    } catch (error) {
      console.error("Error deleting property:", error);
    }
  };

  const calculateOccupancyRate = (occupied: number = 0, total: number = 0) => {
    if (total === 0) return 0;
    return Math.round((occupied / total) * 100);
  };

  const getTotalStats = () => {
    return {
      totalProperties: properties.length,
      totalUnits: properties.reduce((sum, p) => sum + (p.totalUnits || 0), 0),
      occupiedUnits: properties.reduce((sum, p) => sum + (p.occupiedUnits || 0), 0),
      monthlyRevenue: properties.reduce((sum, p) => sum + (p.totalMonthlyRent || 0), 0),
    };
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-lg">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            🏢 Properties
          </h1>
          <p className="text-gray-400 mt-1">Manage all your properties</p>
        </div>
        <Link href="/dashboard/admin/properties">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-700/20 border border-blue-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Building2 className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">{stats.totalProperties}</h3>
          <p className="text-blue-400 text-sm">Total Properties</p>
        </div>

        <div className="bg-gradient-to-br from-green-900/20 to-green-700/20 border border-green-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Home className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">{stats.totalUnits}</h3>
          <p className="text-green-400 text-sm">Total Units</p>
        </div>

        <div className="bg-gradient-to-br from-purple-900/20 to-purple-700/20 border border-purple-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">{stats.occupiedUnits}</h3>
          <p className="text-purple-400 text-sm">Occupied Units</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/20 to-cyan-700/20 border border-cyan-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">
            KSH {stats.monthlyRevenue.toLocaleString()}
          </h3>
          <p className="text-cyan-400 text-sm">Monthly Revenue</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700 text-white"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
          >
            <option value="all">All Types</option>
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="MIXED">Mixed Use</option>
          </select>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => {
          const totalUnits = property.totalUnits || 0;
          const occupiedUnits = property.occupiedUnits || 0;
          const monthlyRent = property.totalMonthlyRent || 0;
          const occupancyRate = calculateOccupancyRate(occupiedUnits, totalUnits);

          return (
            <div
              key={property.id}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-300"
            >
              {/* Property Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {property.name}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{property.address}</span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                  {property.type}
                </span>
              </div>

              {/* Stats */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Total Units</span>
                  <span className="text-white font-semibold">{totalUnits}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Occupancy</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                        style={{ width: `${occupancyRate}%` }}
                      />
                    </div>
                    <span className="text-white font-semibold">{occupancyRate}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Monthly Rent</span>
                  <span className="text-green-400 font-bold">
                    KSH {monthlyRent.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-700">
                <Link
                  href={`/dashboard/properties/${property.id}`}
                  className="flex-1"
                >
                  <Button
                    variant="outline"
                    className="w-full border-gray-700 text-gray-400 hover:bg-gray-800"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </Link>
                <Link href={`/dashboard/admin/properties/${property.id}`}>
                  <Button
                    variant="outline"
                    className="border-gray-700 text-gray-400 hover:bg-gray-800"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => handleDeleteProperty(property.id)}
                  className="border-gray-700 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No properties found</p>
        </div>
      )}
    </div>
  );
}
