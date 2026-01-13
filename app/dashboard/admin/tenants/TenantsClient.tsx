"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Edit, LogOut, Search, Trash2, CheckCircle } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

interface Tenant {
  id: string;
  rentAmount: number;
  leaseStartDate: Date;
  leaseEndDate: Date;
  users: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  units: {
    unitNumber: string;
    status: string;
    properties: {
      id: string;
      name: string;
    };
  };
  lease_agreements: Array<{
    id: string;
    status: string;
    startDate: Date;
    endDate: Date;
    rentAmount: number;
    depositAmount: number;
  }>;
  vacate_notices: Array<{
    noticeDate: Date;
    intendedVacateDate: Date | null;
    actualVacateDate: Date | null;
    status: string;
  }>;
}

interface TenantsClientProps {
  tenants: Tenant[];
  properties: Array<{ id: string; name: string }>;
}

export default function TenantsClient({ tenants: initialTenants, properties }: TenantsClientProps) {
  const [tenants, setTenants] = useState(initialTenants);
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [vacatedFilter, setVacatedFilter] = useState("active");

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [showVacateModal, setShowVacateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  // Filter tenants by property first (for stats calculation)
  const propertyFilteredTenants = useMemo(() => {
    if (!propertyFilter) return tenants;
    return tenants.filter(t => t.units.properties.id === propertyFilter);
  }, [tenants, propertyFilter]);

  // Stats - NOW REACTIVE TO PROPERTY FILTER
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate from property-filtered tenants
    const tenantsToCount = propertyFilteredTenants;

    const activeTenants = tenantsToCount.filter((t) => {
      // Use same logic as display: check active lease first, then fall back to tenant.leaseEndDate
      const leaseEnd = new Date((t.lease_agreements[0]?.endDate || t.leaseEndDate));
      leaseEnd.setHours(0, 0, 0, 0);
      return leaseEnd >= today;
    });

    const expiringCount = activeTenants.filter((t) => {
      const leaseEnd = new Date((t.lease_agreements[0]?.endDate || t.leaseEndDate));
      const daysUntilExpiry = Math.floor(
        (leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length;

    const vacatedCount = tenantsToCount.filter((t) => {
      const leaseEnd = new Date((t.lease_agreements[0]?.endDate || t.leaseEndDate));
      leaseEnd.setHours(0, 0, 0, 0);
      return leaseEnd < today;
    }).length;

    return {
      total: tenantsToCount.length,
      activeLeases: activeTenants.length,
      expiringCount,
      vacated: vacatedCount,
    };
  }, [propertyFilteredTenants]);

  // Full filtered tenants (property + search + vacated filter)
  const filteredTenants = useMemo(() => {
    return propertyFilteredTenants.filter((tenant) => {
      const matchesSearch =
        tenant.users.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.users.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.users.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.units.unitNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const leaseEnd = new Date((tenant.lease_agreements[0]?.endDate || tenant.leaseEndDate));
      leaseEnd.setHours(0, 0, 0, 0);

      const isActive = leaseEnd >= today;
      const isVacated = leaseEnd <= today;

      let matchesVacatedFilter = true;
      if (vacatedFilter === "active") {
        matchesVacatedFilter = isActive;
      } else if (vacatedFilter === "vacated") {
        matchesVacatedFilter = isVacated;
      }

      return matchesSearch && matchesVacatedFilter;
    });
  }, [propertyFilteredTenants, searchTerm, vacatedFilter]);

  const handleVacate = async () => {
    if (!selectedTenantId) return;

    try {
      const response = await fetch(`/api/tenants/${selectedTenantId}/vacate`, {
        method: "POST",
      });

      if (response.ok) {
        setSuccessMessage("Tenant successfully vacated! Unit is now available.");
        setShowSuccessMessage(true);

        setTimeout(() => {
          setShowSuccessMessage(false);
          window.location.reload();
        }, 3000);
      }
    } catch (error) {
      console.error("Failed to vacate tenant:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedTenantId) return;

    try {
      const response = await fetch(`/api/tenants/${selectedTenantId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTenants(tenants.filter((t) => t.id !== selectedTenantId));
      }
    } catch (error) {
      console.error("Failed to delete tenant:", error);
    }
  };

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  return (
    <>
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-gradient-to-br from-green-900/90 to-emerald-900/90 border border-green-500/50 rounded-xl p-4 shadow-2xl shadow-green-500/20 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Success!</p>
                <p className="text-green-200 text-sm">{successMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={showVacateModal}
        onClose={() => setShowVacateModal(false)}
        onConfirm={handleVacate}
        title="Vacate Tenant"
        message={`Are you sure you want to mark ${selectedTenant?.users.firstName} ${selectedTenant?.users.lastName} as vacated? This will terminate their lease and mark Unit ${selectedTenant?.units.unitNumber} as vacant.`}
        confirmText="Vacate Tenant"
        type="warning"
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Tenant"
        message={`Are you sure you want to permanently delete ${selectedTenant?.users.firstName} ${selectedTenant?.users.lastName}? This action cannot be undone.`}
        confirmText="Delete Permanently"
        type="danger"
      />

      {/* Stats - Now showing property-specific stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="group relative bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-700/30 rounded-xl p-4 hover:border-purple-500/60 transition-all">
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-400 text-xs">
              {propertyFilter ? "Property Tenants" : "Total Tenants"}
            </p>
            <span className="text-2xl">👥</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>

        <div className="group relative bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-xl p-4 hover:border-green-500/60 transition-all">
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-400 text-xs">Active Leases</p>
            <span className="text-2xl">🏠</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.activeLeases}</p>
        </div>

        <div className="group relative bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border border-orange-700/30 rounded-xl p-4 hover:border-orange-500/60 transition-all">
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-400 text-xs">Expiring Soon</p>
            <span className="text-2xl">⏰</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.expiringCount}</p>
        </div>

        <div className="group relative bg-gradient-to-br from-gray-900/20 to-slate-900/20 border border-gray-700/30 rounded-xl p-4 hover:border-gray-500/60 transition-all">
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-400 text-xs">Vacated</p>
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.vacated}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
          >
            <option value="">All Properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>

          <select
            value={vacatedFilter}
            onChange={(e) => setVacatedFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
          >
            <option value="active">Active Only</option>
            <option value="vacated">Vacated Only</option>
            <option value="all">All Tenants</option>
          </select>
        </div>
        <p className="text-gray-400 text-sm">
          Showing {filteredTenants.length} of {tenants.length} tenants
          {propertyFilter && ` (${propertyFilteredTenants.length} in selected property)`}
        </p>
      </div>

      {/* Tenants Grid */}
      {filteredTenants.length === 0 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
          <p className="text-gray-400 mb-4">No tenants found</p>
          <Link href="/dashboard/admin/tenants/new">
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
              Add First Tenant
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const leaseEnd = new Date((tenant.lease_agreements[0]?.endDate || tenant.leaseEndDate));
            leaseEnd.setHours(0, 0, 0, 0);

            const isActive = leaseEnd >= today;
            const isVacated = leaseEnd <= today;
            const hasVacateNotice = tenant.vacate_notices.length > 0;

            const daysUntilExpiry = Math.floor(
              (leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={tenant.id}
                className="group bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition-all"
              >
                {/* Tenant Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                      {tenant.users.firstName} {tenant.users.lastName}
                    </h3>
                    <p className="text-gray-400 text-sm">{tenant.users.email}</p>
                    <p className="text-gray-500 text-xs">{tenant.users.phoneNumber}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {isVacated ? (
                      <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full">
                        Vacated
                      </span>
                    ) : hasVacateNotice ? (
                      <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/30">
                        Notice Given
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Property & Unit Info */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Property:</span>
                    <span className="text-white font-medium">{tenant.units.properties.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Unit:</span>
                    <span className="text-white font-medium">{tenant.units.unitNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Rent:</span>
                    <span className="text-white font-medium">KSH {(tenant.lease_agreements[0]?.rentAmount || tenant.rentAmount).toLocaleString()}</span>
                  </div>
                </div>

                {/* Lease Period */}
                <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400">Lease Period</span>
                    {!isVacated && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                      <span className="text-orange-400">Expires in {daysUntilExpiry} days</span>
                    )}
                  </div>
                  <p className="text-white text-sm">
                    {new Date((tenant.lease_agreements[0]?.startDate || tenant.leaseStartDate)).toLocaleDateString()} -{" "}
                    {new Date((tenant.lease_agreements[0]?.endDate || tenant.leaseEndDate)).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link href={`/dashboard/admin/tenants/${tenant.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-gray-700 hover:border-purple-500 text-gray-300"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </Link>
                  {!isVacated && (
                    <Link href={`/dashboard/admin/tenants/${tenant.id}/edit`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-gray-700 hover:border-blue-500 text-gray-300"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                  )}
                  {isActive && !hasVacateNotice && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTenantId(tenant.id);
                        setShowVacateModal(true);
                      }}
                      className="border-gray-700 hover:border-orange-500 text-gray-300"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Vacate
                    </Button>
                  )}
                  {!isVacated && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTenantId(tenant.id);
                        setShowDeleteModal(true);
                      }}
                      className="border-gray-700 hover:border-red-500 text-gray-300"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
