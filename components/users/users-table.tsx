"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users as UsersIcon,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
  UserCog,
  Package,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  role: string;
  isActive: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UsersTableProps {
  users: User[];
}

export default function UsersTable({ users }: UsersTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Role filter
      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === "active" && !user.isActive) return false;
      if (statusFilter === "inactive" && user.isActive) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = user.email.toLowerCase();
        const phone = user.phoneNumber?.toLowerCase() || "";

        if (
          !fullName.includes(query) &&
          !email.includes(query) &&
          !phone.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user");
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/toggle-status`, {
        method: "POST",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update user status");
      }
    } catch (error) {
      console.error("Failed to update user status:", error);
      alert("Failed to update user status");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="h-4 w-4 text-red-400" />;
      case "MANAGER":
        return <UserCog className="h-4 w-4 text-blue-400" />;
      case "CARETAKER":
        return <UsersIcon className="h-4 w-4 text-green-400" />;
      case "STOREKEEPER":
        return <Package className="h-4 w-4 text-yellow-400" />;
      default:
        return <UsersIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "MANAGER":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "CARETAKER":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "STOREKEEPER":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const inactiveUsers = users.filter((u) => !u.isActive).length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;

  return (
    <div className="space-y-8 p-8 min-h-screen relative">
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-bold gradient-text mb-2 flex items-center gap-3">
              <UsersIcon className="h-12 w-12 text-purple-500 animate-pulse" />
              User Management
            </h1>
            <p className="text-gray-400 text-lg">
              Manage system users and permissions
            </p>
          </div>
          <Link href="/dashboard/admin/users/new">
            <button className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all flex items-center gap-2 shadow-lg">
              <Plus className="h-5 w-5" />
              <span className="font-medium">Add User</span>
            </button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Total Users</p>
              <UsersIcon className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">{totalUsers}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Active</p>
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-green-400">{activeUsers}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Inactive</p>
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-red-400">{inactiveUsers}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Administrators</p>
              <Shield className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-red-400">{adminCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900/50 border-purple-500/20 text-white"
              />
            </div>

            {/* Role Filter */}
            <div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-purple-500/20">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="CARETAKER">Caretaker</SelectItem>
                  <SelectItem value="STOREKEEPER">Storekeeper</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-900/50 border-purple-500/20 text-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-purple-500/20">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || roleFilter !== "all" || statusFilter !== "all") && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-400">Active filters:</span>
              {searchQuery && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-sm border border-purple-500/30">
                  Search: "{searchQuery}"
                </span>
              )}
              {roleFilter !== "all" && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-sm border border-purple-500/30">
                  Role: {roleFilter}
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-sm border border-purple-500/30">
                  Status: {statusFilter}
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("all");
                  setStatusFilter("all");
                }}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-400">
            Showing {filteredUsers.length} of {totalUsers} users
          </div>
        </div>

        {/* Users Grid */}
        {filteredUsers.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <UsersIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">
              No Users Found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || roleFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by adding your first user"}
            </p>
            {!searchQuery && roleFilter === "all" && statusFilter === "all" && (
              <Link href="/dashboard/admin/users/new">
                <button className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-all inline-flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add First User
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user, index) => (
              <div
                key={user.id}
                className="glass-card p-6 hover:scale-105 transition-all relative"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Status Indicator */}
                <div className="absolute top-4 right-4">
                  {user.isActive ? (
                    <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                  ) : (
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                  )}
                </div>

                {/* User Info */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-sm text-gray-400">{user.email}</p>
                  {user.phoneNumber && (
                    <p className="text-sm text-gray-500 mt-1">
                      {user.phoneNumber}
                    </p>
                  )}
                </div>

                {/* Role Badge */}
                <div className="mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-2 ${getRoleBadgeColor(
                      user.role
                    )}`}
                  >
                    {getRoleIcon(user.role)}
                    {user.role}
                  </span>
                </div>

                {/* User Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-purple-500/20">
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    <p
                      className={`text-sm font-medium ${
                        user.isActive ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Verified</p>
                    <p className="text-sm font-medium text-gray-300">
                      {user.emailVerified ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/admin/users/${user.id}`}
                    className="flex-1"
                  >
                    <button className="w-full px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors text-sm font-medium text-purple-300 flex items-center justify-center gap-2">
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </Link>
                  <Link
                    href={`/dashboard/admin/users/${user.id}/edit`}
                    className="flex-1"
                  >
                    <button className="w-full px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors text-sm font-medium text-blue-300 flex items-center justify-center gap-2">
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                  </Link>
                  <button
                    onClick={() =>
                      handleToggleStatus(user.id, user.isActive)
                    }
                    className="px-3 py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 transition-colors"
                    title={user.isActive ? "Deactivate" : "Activate"}
                  >
                    {user.isActive ? (
                      <XCircle className="h-4 w-4 text-yellow-300" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-300" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      handleDelete(
                        user.id,
                        `${user.firstName} ${user.lastName}`
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
