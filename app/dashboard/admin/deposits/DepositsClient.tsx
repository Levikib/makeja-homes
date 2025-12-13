"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, TrendingDown, AlertTriangle, CheckCircle, Search, Filter, X, Calendar, Mail, Phone, MapPin } from "lucide-react";

interface Tenant {
  id: string;
  depositAmount: number;
  leaseStartDate: Date;
  leaseEndDate: Date;
  users: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null; // ✅ FIXED: Changed from phone to phoneNumber
  };
  units: {
    unitNumber: string;
    propertyId: string;
    properties: {
      id: string;
      name: string;
    };
  };
}

interface Property {
  id: string;
  name: string;
}

interface Stats {
  totalDeposits: number;
  activeCount: number;
  refundsIssued: number;
  refundsCount: number;
  damagesDeducted: number;
  damagesCount: number;
  pendingRefunds: number;
}

interface DepositsClientProps {
  tenants: Tenant[];
  properties: Property[];
  stats: Stats;
}

export default function DepositsClient({ tenants, properties, stats }: DepositsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Filter tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        `${tenant.users.firstName} ${tenant.users.lastName}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        tenant.users.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.units.unitNumber.toLowerCase().includes(searchQuery.toLowerCase());

      // Property filter
      const matchesProperty =
        selectedProperty === "all" || tenant.units.propertyId === selectedProperty;

      // Status filter
      const isExpired = tenant.leaseEndDate <= new Date();
      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "held" && !isExpired) ||
        (selectedStatus === "refund_due" && isExpired);

      return matchesSearch && matchesProperty && matchesStatus;
    });
  }, [tenants, searchQuery, selectedProperty, selectedStatus]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedProperty("all");
    setSelectedStatus("all");
  };

  const hasActiveFilters = searchQuery !== "" || selectedProperty !== "all" || selectedStatus !== "all";

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Total Deposits Held</h3>
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">KSH {stats.totalDeposits.toLocaleString()}</p>
          <p className="text-xs text-purple-400">{stats.activeCount} active</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Refunds Issued</h3>
            <TrendingDown className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">KSH {stats.refundsIssued.toLocaleString()}</p>
          <p className="text-xs text-green-400">{stats.refundsCount} refunds</p>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-orange-600/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Damages Deducted</h3>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">KSH {stats.damagesDeducted.toLocaleString()}</p>
          <p className="text-xs text-red-400">{stats.damagesCount} claims</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-amber-600/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Pending Refunds</h3>
            <CheckCircle className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.pendingRefunds}</p>
          <p className="text-xs text-yellow-400">Expired leases</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              size="sm"
              variant="ghost"
              className="ml-auto text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search Tenant
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, email, or unit..."
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Property Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Property
            </label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="held">Held</option>
              <option value="refund_due">Refund Due</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Showing <span className="text-purple-400 font-semibold">{filteredTenants.length}</span> of{" "}
            <span className="text-white font-semibold">{tenants.length}</span> deposits
          </p>
        </div>
      </div>

      {/* Deposits Cards Grid */}
      {filteredTenants.length === 0 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
          <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No deposits found</h2>
          <p className="text-gray-400 mb-6">
            {hasActiveFilters
              ? "Try adjusting your filters"
              : "No tenants with security deposits"}
          </p>
          {hasActiveFilters && (
            <Button onClick={clearFilters} variant="outline" className="border-purple-600 text-purple-400">
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => {
            const isExpired = tenant.leaseEndDate <= new Date();
            const daysUntilExpiry = Math.ceil(
              (tenant.leaseEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={tenant.id}
                className={`bg-gray-800/50 border rounded-xl p-6 hover:shadow-lg transition-all ${
                  isExpired
                    ? "border-yellow-500/30 hover:border-yellow-500/50"
                    : "border-gray-700 hover:border-purple-500/50"
                }`}
              >
                {/* Header with Status Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">
                      {tenant.users.firstName} {tenant.users.lastName}
                    </h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {tenant.units.properties.name} - Unit {tenant.units.unitNumber}
                    </p>
                  </div>
                  {isExpired ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                      REFUND DUE
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                      HELD
                    </span>
                  )}
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4 pb-4 border-b border-gray-700">
                  <p className="text-sm text-gray-300 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    {tenant.users.email}
                  </p>
                  {tenant.users.phoneNumber && (
                    <p className="text-sm text-gray-300 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      {tenant.users.phoneNumber}
                    </p>
                  )}
                </div>

                {/* Deposit Amount - Prominent Display */}
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
                  <p className="text-xs text-gray-400 mb-1">Deposit Amount</p>
                  <p className="text-3xl font-bold text-purple-400">
                    KSH {tenant.depositAmount.toLocaleString()}
                  </p>
                </div>

                {/* Lease Period */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Lease Start
                    </span>
                    <span className="text-white">
                      {new Date(tenant.leaseStartDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Lease End
                    </span>
                    <span className={isExpired ? "text-red-400 font-semibold" : "text-white"}>
                      {new Date(tenant.leaseEndDate).toLocaleDateString()}
                    </span>
                  </div>
                  {!isExpired && daysUntilExpiry <= 30 && (
                    <p className="text-xs text-yellow-400 flex items-center gap-1 mt-2">
                      <AlertTriangle className="w-3 h-3" />
                      Expires in {daysUntilExpiry} days
                    </p>
                  )}
                  {isExpired && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-2">
                      <AlertTriangle className="w-3 h-3" />
                      Expired {Math.abs(daysUntilExpiry)} days ago
                    </p>
                  )}
                </div>

                {/* Action Button */}
                {isExpired && (
                  <Link href={`/dashboard/admin/deposits/refund?tenantId=${tenant.id}`}>
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                      <TrendingDown className="w-4 h-4 mr-2" />
                      Process Refund
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
