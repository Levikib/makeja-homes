"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Home, MapPin, Plus, Search, Zap } from "lucide-react";

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  _count?: {
    units: number;
  };
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await fetch("/api/properties");
      if (response.ok) {
        const data = await response.json();
        setProperties(data);
      }
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter((property) =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner">
          <Zap className="h-12 w-12 text-purple-500 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 min-h-screen relative">
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold gradient-text mb-2 flex items-center gap-3">
              <Building2 className="h-12 w-12 text-purple-500 animate-pulse" />
              Properties
            </h1>
            <p className="text-gray-400 text-lg">
              Manage your real estate portfolio
            </p>
          </div>
          <Link href="/dashboard/properties/new">
            <button className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all flex items-center gap-2 shadow-lg">
              <Plus className="h-5 w-5" />
              <span className="font-medium">Add Property</span>
            </button>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="glass-card p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search properties by name or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-purple-500/20 rounded-lg focus:outline-none focus:border-purple-500/50 transition-colors text-white placeholder-gray-500"
            />
          </div>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property, index) => (
            <Link key={property.id} href={`/dashboard/properties/${property.id}`}>
              <div
                className="glass-card p-6 hover:scale-105 transition-all cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                    <Building2 className="h-8 w-8 text-purple-400" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {property.type}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  {property.name}
                </h3>

                <div className="flex items-center gap-2 text-gray-400 mb-4">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{property.address}</span>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-purple-500/20">
                  <Home className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-gray-300">
                    {property._count?.units || 0} {property._count?.units === 1 ? 'Unit' : 'Units'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">
              No properties found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Get started by adding your first property"}
            </p>
            {!searchTerm && (
              <Link href="/dashboard/properties/new">
                <button className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all inline-flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  <span>Add Your First Property</span>
                </button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
