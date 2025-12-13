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

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // FIX: Active = lease end date is in future OR today
    const activeTenants = tenants.filter((t) => {
      const leaseEnd = new Date(t.leaseEndDate);
      leaseEnd.setHours(0, 0, 0, 0);
      return leaseEnd >= today;
    });
    
    const expiringCount = activeTenants.filter((t) => {
      const leaseEnd = new Date(t.leaseEndDate);
      const daysUntilExpiry = Math.floor(
        (leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length;

    // FIX: Vacated = lease end date is in past
    const vacatedCount = tenants.filter((t) => {
      const leaseEnd = new Date(t.leaseEndDate);
      leaseEnd.setHours(0, 0, 0, 0);
      return leaseEnd < today;
    }).length;

    return {
      total: tenants.length,
      activeLeases: activeTenants.length,
      expiringCount,
      vacated: vacatedCount,
    };
  }, [tenants]);

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.users.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.users.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.users.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.units.unitNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProperty =
      !propertyFilter || tenant.units.properties.id === propertyFilter;

    // FIX: Correct filter logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leaseEnd = new Date(tenant.leaseEndDate);
    leaseEnd.setHours(0, 0, 0, 0);
    
    const isActive = leaseEnd >= today; // Lease hasn't ended
    const isVacated = leaseEnd < today; // Lease has ended
    
    let matchesVacatedFilter = true;
    if (vacatedFilter === "active") {
      matchesVacatedFilter = isActive; // Show only active
    } else if (vacatedFilter === "vacated") {
      matchesVacatedFilter = isVacated; // Show only vacated
    }
    // if "all", show everything

    return matchesSearch && matchesProperty && matchesVacatedFilter;
  });

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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="group relative bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-700/30 rounded-xl p-4 hover:border-purple-500/60 transition-all">
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-400 text-xs">Total Tenants</p>
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
            const leaseEnd = new Date(tenant.leaseEndDate);
            leaseEnd.setHours(0, 0, 0, 0);
            
            const isActive = leaseEnd >= today;
            const isVacated = leaseEnd < today;
            const hasVacateNotice = tenant.vacate_notices.length > 0;
            
            const daysUntilExpiry = Math.floor(
              (leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );

            const stayDuration = Math.floor(
              (leaseEnd.getTime() - new Date(tenant.leaseStartDate).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const stayMonths = Math.floor(stayDuration / 30);
            const stayDays = stayDuration % 30;

            return (
              <div
                key={tenant.id}
                className={`group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 border rounded-xl p-6 transition-all hover:shadow-lg ${
                  isVacated 
                    ? "border-gray-600 opacity-75 hover:border-gray-500/50" 
                    : "border-gray-700 hover:border-purple-500/50"
                }`}
              >
                <div className="relative">
                  <div className="absolute top-0 right-0">
                    <div className={`w-3 h-3 rounded-full ${
                      isActive 
                        ? "bg-green-400 animate-pulse shadow-lg shadow-green-400/50" 
                        : "bg-gray-400"
                    }`} />
                  </div>

                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      {tenant.users.firstName} {tenant.users.lastName}
                    </h3>
                    <p className="text-gray-400 text-sm">{tenant.users.email}</p>
                    <p className="text-gray-400 text-sm">📞 {tenant.users.phoneNumber}</p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">🏢</span>
                      <span className="text-white">{tenant.units.properties.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">🏠</span>
                      <span className="text-white">Unit {tenant.units.unitNumber}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-gray-400 text-xs">Monthly Rent</p>
                      <p className="text-green-400 font-bold">
                        KSH {tenant.rentAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">
                        {isVacated ? "Duration" : "Lease Ends"}
                      </p>
                      <p className="text-white text-sm">
                        {isVacated 
                          ? `${stayMonths}m ${stayDays}d`
                          : leaseEnd.toLocaleDateString()
                        }
                      </p>
                    </div>
                  </div>

                  {isVacated && (
                    <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-2 mb-4">
                      <p className="text-gray-400 text-xs text-center">📦 Vacated Tenant</p>
                    </div>
                  )}

                  {!isVacated && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 mb-4">
                      <p className="text-orange-400 text-xs text-center">
                        ⚠️ Expiring in {daysUntilExpiry} days
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Link href={`/dashboard/admin/tenants/${tenant.id}`} className="w-full">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/dashboard/admin/tenants/${tenant.id}/edit`} className="w-full">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    {!isVacated && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTenantId(tenant.id);
                            setShowVacateModal(true);
                          }}
                          className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                        >
                          <LogOut className="w-4 h-4 mr-1" />
                          Vacate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTenantId(tenant.id);
                            setShowDeleteModal(true);
                          }}
                          className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
