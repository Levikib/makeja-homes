"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, UserPlus, Search, Mail, Phone, Building2, Zap, Filter, DollarSign, Calendar } from "lucide-react";

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  moveInDate: string;
  moveOutDate: string | null;
  unit?: {
    id: string;
    unitNumber: string;
    property: {
      id: string;
      name: string;
    };
  };
}

interface Property {
  id: string;
  name: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [propertyFilter, setPropertyFilter] = useState<string>("ALL");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tenantsRes, propertiesRes] = await Promise.all([
        fetch("/api/tenants"),
        fetch("/api/properties"),
      ]);

      if (tenantsRes.ok) {
        const tenantsData = await tenantsRes.json();
        setTenants(tenantsData);
      }

      if (propertiesRes.ok) {
        const propertiesData = await propertiesRes.json();
        setProperties(propertiesData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTenants = tenants.filter((tenant) => {
    // Search filter
    const matchesSearch =
      `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant.email && tenant.email.toLowerCase().includes(searchTerm.toLowerCase()));

    // Status filter
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && tenant.unit && !tenant.moveOutDate) ||
      (statusFilter === "INACTIVE" && (!tenant.unit || tenant.moveOutDate));

    // Property filter
    const matchesProperty =
      propertyFilter === "ALL" ||
      (tenant.unit && tenant.unit.property.id === propertyFilter);

    return matchesSearch && matchesStatus && matchesProperty;
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter((t) => t.unit && !t.moveOutDate).length,
    inactive: tenants.filter((t) => !t.unit || t.moveOutDate).length,
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

  return (
    <div className="space-y-8 p-8 min-h-screen relative">
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold gradient-text mb-2 flex items-center gap-3">
              <Users className="h-12 w-12 text-pink-500 animate-pulse" />
              Tenants
            </h1>
            <p className="text-gray-400 text-lg">
              Manage your tenant relationships
            </p>
          </div>
          <Link href="/dashboard/admin/tenants/new">
            <button className="px-6 py-3 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 hover:scale-105 transition-all flex items-center gap-2 shadow-lg">
              <UserPlus className="h-5 w-5" />
              <span className="font-medium">Add Tenant</span>
            </button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Tenants</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <Users className="h-12 w-12 text-pink-400" />
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Active Tenants</p>
                <p className="text-3xl font-bold text-green-400">{stats.active}</p>
              </div>
              <Users className="h-12 w-12 text-green-400" />
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Inactive Tenants</p>
                <p className="text-3xl font-bold text-orange-400">{stats.inactive}</p>
              </div>
              <Users className="h-12 w-12 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="glass-card p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search tenants by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-pink-500/20 rounded-lg focus:outline-none focus:border-pink-500/50 transition-colors text-white placeholder-gray-500"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-6 mb-6 space-y-4">
          {/* Status Filter */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Filter className="h-5 w-5 text-pink-400" />
              <h3 className="text-lg font-semibold text-white">Status</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-4 py-2 rounded-lg transition-all ${
                  statusFilter === "ALL"
                    ? "bg-pink-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-4 py-2 rounded-lg transition-all ${
                  statusFilter === "ACTIVE"
                    ? "bg-green-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Active ({stats.active})
              </button>
              <button
                onClick={() => setStatusFilter("INACTIVE")}
                className={`px-4 py-2 rounded-lg transition-all ${
                  statusFilter === "INACTIVE"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Inactive ({stats.inactive})
              </button>
            </div>
          </div>

          {/* Property Filter */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Property</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPropertyFilter("ALL")}
                className={`px-4 py-2 rounded-lg transition-all ${
                  propertyFilter === "ALL"
                    ? "bg-purple-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                All Properties
              </button>
              {properties.map((property) => (
                <button
                  key={property.id}
                  onClick={() => setPropertyFilter(property.id)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    propertyFilter === property.id
                      ? "bg-purple-500 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {property.name}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters Button */}
          {(statusFilter !== "ALL" || propertyFilter !== "ALL" || searchTerm) && (
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setPropertyFilter("ALL");
                setSearchTerm("");
              }}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-all"
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Tenants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((tenant, index) => (
            <Link key={tenant.id} href={`/dashboard/admin/tenants/${tenant.id}`}>
              <div
                className="glass-card p-6 hover:scale-105 transition-all cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-pink-500/20 to-rose-500/20">
                    <Users className="h-8 w-8 text-pink-400" />
                  </div>
                  {tenant.unit && !tenant.moveOutDate ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                      Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Inactive
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white mb-4">
                  {tenant.firstName} {tenant.lastName}
                </h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Mail className="h-4 w-4 text-pink-400" />
                    <span className="text-sm truncate">{tenant.email}</span>
                  </div>
                  {tenant.phoneNumber && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Phone className="h-4 w-4 text-pink-400" />
                      <span className="text-sm">{tenant.phoneNumber}</span>
                    </div>
                  )}
                </div>

                {tenant.unit && (
                  <div className="pt-4 border-t border-pink-500/20">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Building2 className="h-4 w-4 text-pink-400" />
                      <span className="text-sm truncate">
                        {tenant.unit.property.name} - Unit {tenant.unit.unitNumber}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {filteredTenants.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">
              No tenants found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== "ALL" || propertyFilter !== "ALL"
                ? "Try adjusting your search or filters"
                : "Get started by adding your first tenant"}
            </p>
            {!searchTerm && statusFilter === "ALL" && propertyFilter === "ALL" && (
              <Link href="/dashboard/admin/tenants/new">
                <button className="px-6 py-3 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 hover:scale-105 transition-all inline-flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  <span>Add Your First Tenant</span>
                </button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
