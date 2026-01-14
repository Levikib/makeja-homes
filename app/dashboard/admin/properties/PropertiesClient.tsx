"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit,
  Archive,
  RotateCcw,
  Eye,
  ChevronDown,
  MapPin,
  Home,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import NotificationModal from "@/components/NotificationModal";

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  type: string;
  description?: string;
  deletedAt?: string | null;
  paystackActive?: boolean;
  _count?: {
    units: number;
  };
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  type: "archive" | "restore";
}

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, type }: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-yellow-500/50 rounded-2xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <AlertTriangle size={80} className="text-yellow-400" />
              </motion.div>
            </div>

            <div className="text-center space-y-4 mb-6">
              <h3 className="text-2xl font-bold text-yellow-400">{title}</h3>
              <p className="text-gray-300 text-lg">{message}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-lg font-semibold text-white bg-gray-700 hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all ${
                  type === "archive"
                    ? "bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                    : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                }`}
              >
                {type === "archive" ? "Archive" : "Restore"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function PropertiesClient() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    propertyId: string;
    propertyName: string;
    type: "archive" | "restore";
  }>({
    isOpen: false,
    propertyId: "",
    propertyName: "",
    type: "archive",
  });

  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    filterProperties();
  }, [properties, searchTerm, typeFilter, statusFilter]);

  const fetchProperties = async () => {
    try {
      const res = await fetch("/api/properties/all");
      const data = await res.json();
      setProperties(data);
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProperties = () => {
    let filtered = properties;

    if (statusFilter === "active") {
      filtered = filtered.filter((p) => !p.deletedAt);
    } else if (statusFilter === "archived") {
      filtered = filtered.filter((p) => p.deletedAt);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((p) => p.type === typeFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.address.toLowerCase().includes(search) ||
          p.city.toLowerCase().includes(search)
      );
    }

    setFilteredProperties(filtered);
  };

  const openArchiveConfirm = (property: Property) => {
    setConfirmModal({
      isOpen: true,
      propertyId: property.id,
      propertyName: property.name,
      type: "archive",
    });
  };

  const openRestoreConfirm = (property: Property) => {
    setConfirmModal({
      isOpen: true,
      propertyId: property.id,
      propertyName: property.name,
      type: "restore",
    });
  };

  const handleConfirm = async () => {
    const { propertyId, propertyName, type } = confirmModal;

    try {
      const endpoint = type === "archive" ? "archive" : "restore";
      const res = await fetch(`/api/properties/${propertyId}/${endpoint}`, {
        method: "PATCH",
      });

      if (res.ok) {
        setNotification({
          isOpen: true,
          type: "success",
          title: type === "archive" ? "Property Archived!" : "Property Restored!",
          message: `${propertyName} has been ${type === "archive" ? "archived" : "restored"} successfully.`,
        });
        fetchProperties();
      } else {
        setNotification({
          isOpen: true,
          type: "error",
          title: "Operation Failed",
          message: `Failed to ${type} the property. Please try again.`,
        });
      }
    } catch (error) {
      console.error(`Error ${type}ing property:`, error);
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: `An error occurred while ${type}ing the property.`,
      });
    } finally {
      setConfirmModal({ ...confirmModal, isOpen: false });
    }
  };

  // Calculate stats
  const activeProperties = properties.filter((p) => !p.deletedAt);
  const archivedProperties = properties.filter((p) => p.deletedAt);
  const totalUnits = activeProperties.reduce((sum, p) => sum + (p._count?.units || 0), 0);
  const residentialCount = activeProperties.filter((p) => p.type === "RESIDENTIAL").length;
  const commercialCount = activeProperties.filter((p) => p.type === "COMMERCIAL").length;
  const paystackEnabledCount = activeProperties.filter((p) => p.paystackActive).length;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "RESIDENTIAL":
        return "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400";
      case "COMMERCIAL":
        return "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400";
      case "MIXED_USE":
        return "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400";
      default:
        return "from-gray-500/20 to-slate-500/20 border-gray-500/30 text-gray-400";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "RESIDENTIAL":
        return "🏡";
      case "COMMERCIAL":
        return "🏢";
      case "MIXED_USE":
        return "🏬";
      default:
        return "🏠";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-cyan-400 text-xl">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
            Properties
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {filteredProperties.length} {filteredProperties.length === 1 ? "property" : "properties"} found
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg text-purple-400 hover:from-purple-500/20 hover:to-pink-500/20 transition-all"
          >
            <Filter size={20} />
            Filters
            <ChevronDown
              size={16}
              className={`transform transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </button>
          <Link href="/dashboard/admin/properties/new">
            <Button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg text-white hover:from-cyan-600 hover:to-blue-600 transition-all">
              <Plus size={20} />
              Add Property
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-700/50 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <Building2 className="w-10 h-10 text-cyan-400" />
            <TrendingUp className="w-6 h-6 text-cyan-400/50" />
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{activeProperties.length}</h3>
          <p className="text-cyan-400 text-sm font-medium">Active Properties</p>
          {archivedProperties.length > 0 && (
            <p className="text-gray-500 text-xs mt-1">{archivedProperties.length} archived</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/50 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <Home className="w-10 h-10 text-green-400" />
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{totalUnits}</h3>
          <p className="text-green-400 text-sm font-medium">Total Units</p>
          <p className="text-gray-500 text-xs mt-1">Across all properties</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-700/50 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <CreditCard className="w-10 h-10 text-yellow-400" />
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{paystackEnabledCount}</h3>
          <p className="text-yellow-400 text-sm font-medium">Paystack Enabled</p>
          <p className="text-gray-500 text-xs mt-1">Online payments</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-700/50 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl">🏡</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{residentialCount}</h3>
          <p className="text-blue-400 text-sm font-medium">Residential</p>
          <p className="text-gray-500 text-xs mt-1">Properties</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-700/50 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl">🏢</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{commercialCount}</h3>
          <p className="text-purple-400 text-sm font-medium">Commercial</p>
          <p className="text-gray-500 text-xs mt-1">Properties</p>
        </motion.div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, address, city..."
                      className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Property Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="all">All Types</option>
                    <option value="RESIDENTIAL">Residential</option>
                    <option value="COMMERCIAL">Commercial</option>
                    <option value="MIXED_USE">Mixed Use</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="all">All Properties</option>
                    <option value="active">Active Only</option>
                    <option value="archived">Archived Only</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <div className="text-center py-12">
          <Building2 size={64} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No properties found</h3>
          <p className="text-gray-500">Try adjusting your filters or add a new property</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border rounded-lg p-6 hover:border-purple-500/40 transition-all group ${
                property.deletedAt ? "opacity-60 border-gray-700/50" : "border-purple-500/20"
              }`}
            >
              {/* Property Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getTypeIcon(property.type)}</span>
                    <h3 className="text-xl font-bold text-white">{property.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <MapPin size={14} />
                    <span>{property.address}, {property.city}</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border bg-gradient-to-r ${getTypeColor(property.type)}`}>
                  {property.type.replace("_", " ")}
                </span>
              </div>

              {/* Status Badges */}
              <div className="mb-4 flex gap-2">
                {property.deletedAt && (
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                    Archived
                  </span>
                )}
                {property.paystackActive && !property.deletedAt && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Paystack Active
                  </span>
                )}
              </div>

              {/* Units Count */}
              {property._count && (
                <div className="mb-4 flex items-center gap-2 text-gray-400">
                  <Home size={16} />
                  <span className="text-sm">{property._count.units} units</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-700/50">
                {/* Primary Actions Row */}
                <div className="flex gap-2">
                  <Link href={`/dashboard/properties/${property.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 flex items-center justify-center gap-2"
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </Button>
                  </Link>

                  {!property.deletedAt && (
                    <Link href={`/dashboard/admin/properties/${property.id}/edit`}>
                      <Button
                        variant="outline"
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 flex items-center gap-2"
                      >
                        <Edit size={14} />
                        <span>Edit</span>
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Secondary Actions Row */}
                <div className="flex gap-2">
                  {!property.deletedAt ? (
                    <>
                      {/* Payment Settings Button - PROMINENT */}
                      <Link href={`/dashboard/admin/properties/${property.id}/payment-settings`} className="flex-1">
                        <Button
                          variant="outline"
                          className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10 flex items-center justify-center gap-2 font-semibold"
                        >
                          <DollarSign size={14} />
                          <span>Payment Setup</span>
                        </Button>
                      </Link>

                      <Button
                        variant="outline"
                        onClick={() => openArchiveConfirm(property)}
                        className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 flex items-center gap-2"
                      >
                        <Archive size={14} />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => openRestoreConfirm(property)}
                      className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10 flex items-center gap-2"
                    >
                      <RotateCcw size={14} />
                      <span>Restore</span>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.type === "archive" ? "Archive Property?" : "Restore Property?"}
        message={
          confirmModal.type === "archive"
            ? `Are you sure you want to archive "${confirmModal.propertyName}"? You can restore it later.`
            : `Are you sure you want to restore "${confirmModal.propertyName}"? It will become active again.`
        }
        onConfirm={handleConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        type={confirmModal.type}
      />

      {/* Notification Modal */}
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