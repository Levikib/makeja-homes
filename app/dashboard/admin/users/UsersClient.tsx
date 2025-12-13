"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Power, Trash2 } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
}

interface UsersClientProps {
  users: User[];
}

export default function UsersClient({ users: initialUsers }: UsersClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Modal states
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
    admins: users.filter((u) => u.role === "ADMIN").length,
  }), [users]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "active" ? user.isActive : !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleToggleStatus = async () => {
    if (!selectedUserId) return;

    try {
      const response = await fetch(`/api/users/${selectedUserId}/toggle-status`, {
        method: "POST",
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map((u) => (u.id === selectedUserId ? updatedUser : u)));
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedUserId) return;

    try {
      const response = await fetch(`/api/users/${selectedUserId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setUsers(users.filter((u) => u.id !== selectedUserId));
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <>
      {/* Modals */}
      <ConfirmModal
        isOpen={showToggleModal}
        onClose={() => setShowToggleModal(false)}
        onConfirm={handleToggleStatus}
        title={selectedUser?.isActive ? "Deactivate User" : "Activate User"}
        message={`Are you sure you want to ${selectedUser?.isActive ? 'deactivate' : 'activate'} ${selectedUser?.firstName} ${selectedUser?.lastName}? ${selectedUser?.isActive ? 'They will lose access to the system.' : 'They will regain access to the system.'}`}
        confirmText={selectedUser?.isActive ? "Deactivate" : "Activate"}
        type={selectedUser?.isActive ? "warning" : "info"}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to permanently delete ${selectedUser?.firstName} ${selectedUser?.lastName}? This action cannot be undone and all associated data will be lost.`}
        confirmText="Delete Permanently"
        type="danger"
      />

      {/* Reactive Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="group relative bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded-xl p-4 hover:border-blue-500/60 transition-all hover:shadow-lg hover:shadow-blue-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-gray-400 text-xs mb-1">Total Users</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="group relative bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-xl p-4 hover:border-green-500/60 transition-all hover:shadow-lg hover:shadow-green-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-gray-400 text-xs mb-1">Active</p>
          <p className="text-3xl font-bold text-white">{stats.active}</p>
        </div>
        <div className="group relative bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-700/30 rounded-xl p-4 hover:border-red-500/60 transition-all hover:shadow-lg hover:shadow-red-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-gray-400 text-xs mb-1">Inactive</p>
          <p className="text-3xl font-bold text-white">{stats.inactive}</p>
        </div>
        <div className="group relative bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-700/30 rounded-xl p-4 hover:border-purple-500/60 transition-all hover:shadow-lg hover:shadow-purple-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-gray-400 text-xs mb-1">Administrators</p>
          <p className="text-3xl font-bold text-white">{stats.admins}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="CARETAKER">Caretaker</option>
            <option value="STOREKEEPER">Storekeeper</option>
            <option value="TECHNICAL">Technical</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <p className="text-gray-400 text-sm mt-2">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="relative group bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />
            </div>

            <div className="relative">
              <div className="absolute top-0 right-0">
                {user.isActive ? (
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
                ) : (
                  <div className="w-3 h-3 bg-red-400 rounded-full" />
                )}
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-semibold text-white">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-gray-400 text-sm">{user.email}</p>
                <p className="text-gray-500 text-sm">{user.phoneNumber || "No phone"}</p>
              </div>

              <div className="mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.role === "ADMIN"
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : user.role === "MANAGER"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                      : "bg-green-500/20 text-green-400 border border-green-500/40"
                  }`}
                >
                  {user.role}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                <div>
                  <p className="text-gray-400">Status</p>
                  <p className={user.isActive ? "text-green-400 font-semibold" : "text-red-400"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Verified</p>
                  <p className={user.emailVerified ? "text-green-400" : "text-yellow-400"}>
                    {user.emailVerified ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link href={`/dashboard/admin/users/${user.id}`} className="w-full">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </Link>
                <Link href={`/dashboard/admin/users/${user.id}/edit`} className="w-full">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/20"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedUserId(user.id);
                    setShowToggleModal(true);
                  }}
                  className={`w-full ${
                    user.isActive
                      ? "border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-500/20"
                      : "border-green-500/50 text-green-400 hover:bg-green-500/10 hover:border-green-400 hover:shadow-lg hover:shadow-green-500/20"
                  }`}
                >
                  <Power className="w-4 h-4 mr-1" />
                  {user.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedUserId(user.id);
                    setShowDeleteModal(true);
                  }}
                  className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-400 hover:shadow-lg hover:shadow-red-500/20"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
