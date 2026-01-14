"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  UserPlus,
  Filter,
  Edit,
  Eye,
  Power,
  Trash2,
  Users,
  UserCheck,
  UserX,
  Shield,
  Wrench,
  Package,
  User
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import NotificationModal from "@/components/NotificationModal";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  isActive: boolean;
  deletedAt?: string | null;
}

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  type,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  type: "deactivate" | "activate" | "delete";
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-white mb-4">
              {type === "deactivate" ? "Deactivate User?" : type === "activate" ? "Activate User?" : "Delete User?"}
            </h3>
            <p className="text-gray-300 mb-6">
              {type === "delete" ? (
                <>
                  Are you sure you want to <strong className="text-red-400">permanently delete</strong> <strong>{userName}</strong>?
                  <br /><br />
                  <span className="text-yellow-400">⚠️ This action cannot be undone!</span>
                </>
              ) : (
                <>Are you sure you want to {type} <strong>{userName}</strong>?</>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  type === "deactivate"
                    ? "bg-orange-600 hover:bg-orange-700 text-white"
                    : type === "activate"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-red-700 hover:bg-red-800 text-white font-bold"
                }`}
              >
                {type === "deactivate" ? "Deactivate" : type === "activate" ? "Activate" : "Delete Permanently"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    userId: "",
    userName: "",
    type: "deactivate" as "deactivate" | "activate" | "delete",
  });

  const [notification, setNotification] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    if (statusFilter === "active") {
      filtered = filtered.filter((u) => u.isActive);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((u) => !u.isActive);
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.firstName.toLowerCase().includes(search) ||
          u.lastName.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  const handleToggleStatus = async () => {
    const { userId, type } = confirmModal;

    try {
      const res = await fetch(`/api/users/${userId}/${type}`, { method: "PATCH" });

      if (res.ok) {
        setNotification({
          isOpen: true,
          type: "success",
          title: `User ${type === "activate" ? "Activated" : "Deactivated"}!`,
          message: `The user has been ${type === "activate" ? "activated" : "deactivated"} successfully.`,
        });
        fetchUsers();
      } else {
        throw new Error();
      }
    } catch (error) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Operation Failed",
        message: `Failed to ${type} the user.`,
      });
    }
  };

  const handleDelete = async () => {
    const { userId } = confirmModal;

    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });

      if (res.ok) {
        setNotification({
          isOpen: true,
          type: "success",
          title: "User Deleted!",
          message: "The user has been permanently deleted.",
        });
        fetchUsers();
      } else {
        throw new Error();
      }
    } catch (error) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Delete Failed",
        message: "Failed to delete the user.",
      });
    }
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === "delete") {
      handleDelete();
    } else {
      handleToggleStatus();
    }
  };

  const stats = {
    total: filteredUsers.length,
    active: filteredUsers.filter((u) => u.isActive).length,
    inactive: filteredUsers.filter((u) => !u.isActive).length,
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="w-4 h-4" />;
      case "MANAGER":
        return <User className="w-4 h-4" />;
      case "CARETAKER":
        return <Wrench className="w-4 h-4" />;
      case "STOREKEEPER":
        return <Package className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-blue-600/20 to-blue-400/20 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-sm">Total Users</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
            </div>
            <Users className="w-12 h-12 text-blue-400" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-green-600/20 to-green-400/20 border border-green-500/30 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-300 text-sm">Active</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.active}</p>
            </div>
            <UserCheck className="w-12 h-12 text-green-400" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-red-600/20 to-red-400/20 border border-red-500/30 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-300 text-sm">Inactive</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.inactive}</p>
            </div>
            <UserX className="w-12 h-12 text-red-400 opacity-50" />
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors">
              <option value="all">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="CARETAKER">Caretaker</option>
              <option value="STOREKEEPER">Storekeeper</option>
              <option value="TECHNICAL">Technical</option>
            </select>
          </div>

          <div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-gray-400">
          Showing <span className="text-white font-semibold">{filteredUsers.length}</span> of{" "}
          <span className="text-white font-semibold">{users.length}</span> users
        </p>
        <Link href="/dashboard/admin/users/new">
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/20">
            <UserPlus className="w-5 h-5 mr-2" />
            Add User
          </Button>
        </Link>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map((user, index) => (
          <motion.div key={user.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">{user.firstName} {user.lastName}</h3>
                <p className="text-sm text-gray-400">{user.email}</p>
                {user.phoneNumber && <p className="text-sm text-gray-500">{user.phoneNumber}</p>}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {user.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="mb-4 bg-gray-900/30 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                  user.role === "ADMIN" ? "bg-purple-500/20 text-purple-300" :
                  user.role === "MANAGER" ? "bg-blue-500/20 text-blue-300" :
                  user.role === "CARETAKER" ? "bg-green-500/20 text-green-300" :
                  user.role === "STOREKEEPER" ? "bg-orange-500/20 text-orange-300" :
                  "bg-gray-500/20 text-gray-300"
                }`}>
                  {getRoleIcon(user.role)}
                  {user.role}
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Link href={`/dashboard/admin/users/${user.id}`} className="flex-1 min-w-[100px]">
                <button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                  <Eye className="w-4 h-4" />
                  <span className="font-medium">View</span>
                </button>
              </Link>

              <Link href={`/dashboard/admin/users/${user.id}/edit`}>
                <button className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-purple-500/20">
                  <Edit className="w-4 h-4" />
                  <span className="font-medium">Edit</span>
                </button>
              </Link>

              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    userId: user.id,
                    userName: `${user.firstName} ${user.lastName}`,
                    type: user.isActive ? "deactivate" : "activate",
                  })
                }
                className={`${
                  user.isActive
                    ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 shadow-orange-500/20"
                    : "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-green-500/20"
                } text-white py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg`}
              >
                <Power className="w-4 h-4" />
                <span className="font-medium">{user.isActive ? "Deactivate" : "Activate"}</span>
              </button>

              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    userId: user.id,
                    userName: `${user.firstName} ${user.lastName}`,
                    type: "delete",
                  })
                }
                className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-red-500/20"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl">
          <UserX className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No users found</p>
          <p className="text-gray-500 text-sm">Try adjusting your filters</p>
        </motion.div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleConfirmAction}
        userName={confirmModal.userName}
        type={confirmModal.type}
      />

      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />
    </div>
  );
}
