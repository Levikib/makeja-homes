"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Users,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Home,
  Building2,
  Mail,
  Phone,
  DollarSign,
  AlertCircle,
  LogOut,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Tenant {
  id: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  };
  unit: {
    id: string;
    unitNumber: string;
    property: {
      id: string;
      name: string;
    };
  };
  rentAmount: number;
  depositAmount: number;
  leaseStartDate: Date;
  leaseEndDate: Date;
  payments: Array<{
    id: string;
    dueDate: Date;
    amount: number;
  }>;
}

interface TenantsTableProps {
  tenants: Tenant[];
}

export default function TenantsTable({ tenants }: TenantsTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");

  const filteredTenants = useMemo(() => {
    if (!tenants || !Array.isArray(tenants)) {
      return [];
    }

    return tenants.filter((tenant) => {
      if (propertyFilter !== "all" && tenant.unit.property.id !== propertyFilter) {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${tenant.user.firstName} ${tenant.user.lastName}`.toLowerCase();
        const email = tenant.user.email.toLowerCase();
        const unit = tenant.unit.unitNumber.toLowerCase();
        const property = tenant.unit.property.name.toLowerCase();

        if (!fullName.includes(query) && !email.includes(query) && !unit.includes(query) && !property.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [tenants, searchQuery, propertyFilter]);

  const handleDelete = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Are you sure you want to remove tenant "${tenantName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete tenant");
      }
    } catch (error) {
      console.error("Failed to delete tenant:", error);
      alert("Failed to delete tenant");
    }
  };

  const handleVacate = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Mark "${tenantName}" as vacated? This will free up their unit.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tenants/${tenantId}/vacate`, {
        method: "POST",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to vacate tenant");
      }
    } catch (error) {
      console.error("Failed to vacate tenant:", error);
      alert("Failed to vacate tenant");
    }
  };

  const uniqueProperties = Array.from(
    new Set(tenants.map((t) => t.unit.property.id))
  ).map((id) => {
    const tenant = tenants.find((t) => t.unit.property.id === id);
    return {
      id,
      name: tenant?.unit.property.name || "",
    };
  });

  const totalTenants = tenants?.length || 0;
  const activeLeases = tenants?.filter((t) => new Date(t.leaseEndDate) > new Date()).length || 0;
  const expiringSoon = tenants?.filter((t) => {
    const daysUntilExpiry = Math.floor(
      (new Date(t.leaseEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }).length || 0;
  const pendingPayments = tenants?.filter((t) => t.payments.length > 0).length || 0;

  return (
    <div className="space-y-8 p-8 min-h-screen relative">
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-bold gradient-text mb-2 flex items-center gap-3">
              <Users className="h-12 w-12 text-purple-500 animate-pulse" />
              Tenants
            </h1>
            <p className="text-gray-400 text-lg">
              Manage tenants and leases
            </p>
          </div>
          <Link href="/dashboard/admin/tenants/new">
            <button className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all flex items-center gap-2 shadow-lg">
              <Plus className="h-5 w-5" />
              <span className="font-medium">Add Tenant</span>
            </button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Total Tenants</p>
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">{totalTenants}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Active Leases</p>
              <Home className="h-5 w-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-green-400">{activeLeases}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Expiring Soon</p>
              <AlertCircle className="h-5 w-5 text-orange-400" />
            </div>
            <p className="text-3xl font-bold text-orange-400">{expiringSoon}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Pending Payments</p>
              <DollarSign className="h-5 w-5 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-yellow-400">{pendingPayments}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900/50 border-purple-500/20 text-white"
              />
            </div>

            <div>
              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-purple-500/20">
                  <SelectItem value="all">All Properties</SelectItem>
                  {uniqueProperties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-400">
            Showing {filteredTenants.length} of {totalTenants} tenants
          </div>
        </div>

        {/* Tenants Grid */}
        {filteredTenants.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">
              No Tenants Found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || propertyFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by adding your first tenant"}
            </p>
            {!searchQuery && propertyFilter === "all" && (
              <Link href="/dashboard/admin/tenants/new">
                <button className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all inline-flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add First Tenant
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTenants.map((tenant, index) => (
              <div
                key={tenant.id}
                className="glass-card p-6 hover:scale-105 transition-all relative"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Tenant Name */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {tenant.user.firstName} {tenant.user.lastName}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Mail className="h-3 w-3" />
                    <span>{tenant.user.email}</span>
                  </div>
                  {tenant.user.phoneNumber && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                      <Phone className="h-3 w-3" />
                      <span>{tenant.user.phoneNumber}</span>
                    </div>
                  )}
                </div>

                {/* Property & Unit */}
                <div className="mb-4 pb-4 border-b border-purple-500/20">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <Building2 className="h-4 w-4 text-purple-400" />
                    <Link
                      href={`/dashboard/properties/${tenant.unit.property.id}`}
                      className="text-purple-400 hover:text-purple-300"
                    >
                      {tenant.unit.property.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Home className="h-4 w-4 text-purple-400" />
                    <span>Unit {tenant.unit.unitNumber}</span>
                  </div>
                </div>

                {/* Rent & Lease */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Monthly Rent</p>
                    <p className="text-sm font-medium text-green-400">
                      KSH {tenant.rentAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Lease Ends</p>
                    <p className="text-sm font-medium text-gray-300">
                      {new Date(tenant.leaseEndDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Pending Payments */}
                {tenant.payments.length > 0 && (
                  <div className="mb-4 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 text-xs text-yellow-400">
                      <AlertCircle className="h-3 w-3" />
                      <span>{tenant.payments.length} Pending Payment(s)</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Link href={`/dashboard/admin/tenants/${tenant.id}`} className="flex-1">
                    <button className="w-full px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors text-sm font-medium text-purple-300 flex items-center justify-center gap-2">
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </Link>
                  <Link href={`/dashboard/admin/tenants/${tenant.id}/edit`}>
                    <button className="px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors">
                      <Edit className="h-4 w-4 text-blue-300" />
                    </button>
                  </Link>
                  <button
                    onClick={() =>
                      handleVacate(
                        tenant.id,
                        `${tenant.user.firstName} ${tenant.user.lastName}`
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 transition-colors"
                    title="Mark as Vacated"
                  >
                    <LogOut className="h-4 w-4 text-orange-300" />
                  </button>
                  <button
                    onClick={() =>
                      handleDelete(
                        tenant.id,
                        `${tenant.user.firstName} ${tenant.user.lastName}`
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-red-300" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
