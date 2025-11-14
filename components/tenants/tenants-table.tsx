"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, Eye, Edit, Search, Filter } from "lucide-react";
import MoveOutDialog from "@/components/tenants/move-out-dialog";

interface Tenant {
  id: string;
  moveInDate: Date | null;
  moveOutDate: Date | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  unit?: {
    id: string;
    unitNumber: string;
    property: {
      id: string;
      name: string;
    };
  } | null;
  leases: any[];
  payments: any[];
}

interface Property {
  id: string;
  name: string;
}

interface TenantsTableProps {
  tenants: Tenant[];
  properties: Property[];
}

export default function TenantsTable({ tenants, properties }: TenantsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Filter and search tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      // Status filter
      if (statusFilter === "active" && tenant.moveOutDate) return false;
      if (statusFilter === "inactive" && !tenant.moveOutDate) return false;

      // Property filter
      if (propertyFilter !== "all") {
        if (!tenant.unit || tenant.unit.property.id !== propertyFilter) {
          return false;
        }
      }

      // Payment filter (for future use)
      if (paymentFilter === "pending") {
        if (tenant.payments.length === 0) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${tenant.user.firstName} ${tenant.user.lastName}`.toLowerCase();
        const email = tenant.user.email.toLowerCase();
        const phone = tenant.user.phoneNumber.toLowerCase();
        const unitNumber = tenant.unit?.unitNumber.toLowerCase() || "";

        if (
          !fullName.includes(query) &&
          !email.includes(query) &&
          !phone.includes(query) &&
          !unitNumber.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [tenants, searchQuery, propertyFilter, statusFilter, paymentFilter]);

  const activeTenants = filteredTenants.filter((t) => !t.moveOutDate);
  const inactiveTenants = filteredTenants.filter((t) => t.moveOutDate);

  const totalTenants = tenants.length;
  const totalActive = tenants.filter((t) => !t.moveOutDate).length;
  const totalInactive = tenants.filter((t) => t.moveOutDate).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Tenants
          </h1>
          <p className="text-gray-500 mt-1">
            Manage tenant information and assignments
          </p>
        </div>
        <Link href="/dashboard/admin/tenants/new">
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Add Tenant
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <p className="text-sm text-gray-500">Total Tenants</p>
          <p className="text-3xl font-bold mt-1">{totalTenants}</p>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <p className="text-sm text-gray-500">Active Tenants</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{totalActive}</p>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <p className="text-sm text-gray-500">Moved Out</p>
          <p className="text-3xl font-bold mt-1 text-gray-400">{totalInactive}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, phone, unit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Property Filter */}
          <div>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Moved Out Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Filter (Placeholder for future) */}
          <div>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="pending">Pending Payments</SelectItem>
                <SelectItem value="overdue" disabled>Overdue (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchQuery || propertyFilter !== "all" || statusFilter !== "active" || paymentFilter !== "all") && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Active filters:</span>
            {searchQuery && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                Search: "{searchQuery}"
              </span>
            )}
            {propertyFilter !== "all" && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                Property: {properties.find((p) => p.id === propertyFilter)?.name}
              </span>
            )}
            {statusFilter !== "active" && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                Status: {statusFilter}
              </span>
            )}
            {paymentFilter !== "all" && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                Payments: {paymentFilter}
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery("");
                setPropertyFilter("all");
                setStatusFilter("active");
                setPaymentFilter("all");
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredTenants.length} of {tenants.length} tenants
        </div>
      </div>

      {/* Active Tenants Table */}
      {statusFilter !== "inactive" && (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">
              Active Tenants ({activeTenants.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            {activeTenants.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Tenants Found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery || propertyFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Get started by adding your first tenant"}
                </p>
                {!searchQuery && propertyFilter === "all" && (
                  <Link href="/dashboard/admin/tenants/new">
                    <Button>Add Tenant</Button>
                  </Link>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Move-in Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium">
                          {tenant.user.firstName} {tenant.user.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {tenant.user.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {tenant.user.phoneNumber}
                      </td>
                      <td className="px-6 py-4">
                        {tenant.unit ? (
                          <div>
                            <div className="font-medium">
                              Unit {tenant.unit.unitNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {tenant.unit.property.name}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">
                            No unit assigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {tenant.moveInDate
                          ? new Date(tenant.moveInDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {tenant.leases.length > 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium w-fit">
                              Active Lease
                            </span>
                          )}
                          {tenant.payments.length > 0 && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium w-fit">
                              Pending Payment
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/admin/tenants/${tenant.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Link href={`/dashboard/admin/tenants/${tenant.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </Link>
                          <MoveOutDialog tenant={tenant} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Inactive Tenants (Moved Out) */}
      {statusFilter !== "active" && inactiveTenants.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-500">
              Moved Out Tenants ({inactiveTenants.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Previous Unit
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Move-out Date
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inactiveTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50 opacity-60">
                    <td className="px-6 py-4">
                      <div className="font-medium">
                        {tenant.user.firstName} {tenant.user.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {tenant.user.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {tenant.unit
                        ? `Unit ${tenant.unit.unitNumber} - ${tenant.unit.property.name}`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {tenant.moveOutDate
                        ? new Date(tenant.moveOutDate).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/dashboard/admin/tenants/${tenant.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
