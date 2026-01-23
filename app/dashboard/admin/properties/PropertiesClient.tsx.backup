"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Filter,
  Edit,
  Archive,
  RotateCcw,
  Eye,
  ChevronDown,
  MapPin,
  Home,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Shield,
  Wrench,
  Package,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import NotificationModal from "@/components/NotificationModal";
import { useRouter } from "next/navigation";

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
  managerId?: string | null;
  caretakerId?: string | null;
  storekeeperId?: string | null;
  _count?: {
    units: number;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  propertyName,
  type,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  propertyName: string;
  type: "archive" | "restore" | "delete";
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
              {type === "archive" ? "Archive Property?" : type === "restore" ? "Restore Property?" : "Delete Property?"}
            </h3>
            <p className="text-gray-300 mb-6">
              {type === "delete" ? (
                <>
                  Are you sure you want to <strong className="text-red-400">permanently delete</strong> <strong>{propertyName}</strong>?
                  <br /><br />
                  <span className="text-yellow-400">⚠️ This will delete ALL units, leases, tenants, and expenses associated with this property. This action cannot be undone!</span>
                </>
              ) : (
                <>Are you sure you want to {type} <strong>{propertyName}</strong>?</>
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
                  type === "archive"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : type === "restore"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-red-700 hover:bg-red-800 text-white font-bold"
                }`}
              >
                {type === "archive" ? "Archive" : type === "restore" ? "Restore" : "Delete Permanently"}
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

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [managerFilter, setManagerFilter] = useState("");
  const [caretakerFilter, setCaretakerFilter] = useState("");
  const [storekeeperFilter, setStorekeeperFilter] = useState("");

  const [managers, setManagers] = useState<User[]>([]);
  const [caretakers, setCaretakers] = useState<User[]>([]);
  const [storekeepers, setStorekeepers] = useState<User[]>([]);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    propertyId: "",
    propertyName: "",
    type: "archive" as "archive" | "restore" | "delete",
  });

  const [notification, setNotification] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  const fetchProperties = async () => {
    try {
      // Include archived properties so we can filter them client-side
      const res = await fetch("/api/properties/all?includeArchived=true");
      const data = await res.json();
      setProperties(data.properties || []);
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const [managersRes, caretakersRes, storekeepersRes] = await Promise.all([
        fetch("/api/users?role=MANAGER"),
        fetch("/api/users?role=CARETAKER"),
        fetch("/api/users?role=STOREKEEPER"),
      ]);

      const managersData = await managersRes.json();
      const caretakersData = await caretakersRes.json();
      const storekeepersData = await storekeepersRes.json();

      setManagers(managersData.users || []);
      setCaretakers(caretakersData.users || []);
      setStorekeepers(storekeepersData.users || []);
    } catch (error) {
      console.error("Failed to fetch staff:", error);
    }
  };

  useEffect(() => {
    fetchProperties();
        setConfirmModal({ ...confirmModal, isOpen: false });
    fetchStaff();
  }, []);


  useEffect(() => {
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

    if (managerFilter) {
      filtered = filtered.filter((p) => p.managerId === managerFilter);
    }
    if (caretakerFilter) {
      filtered = filtered.filter((p) => p.caretakerId === caretakerFilter);
    }
    if (storekeeperFilter) {
      filtered = filtered.filter((p) => p.storekeeperId === storekeeperFilter);
    }

    setFilteredProperties(filtered);
  }, [properties, searchTerm, typeFilter, statusFilter, managerFilter, caretakerFilter, storekeeperFilter]);

  // Get unique property types from actual data
    // Standardized property types (matching forms)
  const propertyTypes = ["RESIDENTIAL", "COMMERCIAL", "MIXED_USE"];

  const handleArchiveRestore = async () => {
    const { propertyId, type } = confirmModal;
    const endpoint =
      type === "archive"
        ? `/api/properties/${propertyId}/archive`
        : `/api/properties/${propertyId}/restore`;

    try {
      const res = await fetch(endpoint, { method: "PATCH" });

      if (res.ok) {
        setNotification({
          isOpen: true,
          type: "success",
          title: `Property ${type === "archive" ? "Archived" : "Restored"}!`,
          message: `The property has been ${type === "archive" ? "archived" : "restored"} successfully.`,
        });
        fetchProperties();
        setConfirmModal({ ...confirmModal, isOpen: false });
      } else {
        throw new Error();
      }
    } catch (error) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Operation Failed",
        message: `Failed to ${type} the property.`,
      });
    }
  };

  const handleDelete = async () => {
    const { propertyId } = confirmModal;

    try {
      const res = await fetch(`/api/properties/${propertyId}`, { method: "DELETE" });

      if (res.ok) {
        setNotification({
          isOpen: true,
          type: "success",
          title: "Property Deleted!",
          message: "The property and all associated data have been permanently deleted.",
        });
        fetchProperties();
        setConfirmModal({ ...confirmModal, isOpen: false });
      } else {
        throw new Error();
      }
    } catch (error) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Delete Failed",
        message: "Failed to delete the property.",
      });
    }
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === "delete") {
      handleDelete();
    } else {
      handleArchiveRestore();
    }
  };

  const clearAdvancedFilters = () => {
    setManagerFilter("");
    setCaretakerFilter("");
    setStorekeeperFilter("");
  };

  const stats = {
    total: filteredProperties.length,
    active: filteredProperties.filter((p) => !p.deletedAt).length,
    archived: filteredProperties.filter((p) => p.deletedAt).length,
    totalUnits: filteredProperties.reduce((sum, p) => sum + (p._count?.units || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="bg-gradient-to-br from-blue-600/20 to-blue-400/20 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-sm">Total Properties</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
            </div>
            <Home className="w-12 h-12 text-blue-400" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-green-600/20 to-green-400/20 border border-green-500/30 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-300 text-sm">Active</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.active}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-400" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-red-600/20 to-red-400/20 border border-red-500/30 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-300 text-sm">Archived</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.archived}</p>
            </div>
            <Archive className="w-12 h-12 text-red-400" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-purple-600/20 to-purple-400/20 border border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm">Total Units</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.totalUnits}</p>
            </div>
            <Users className="w-12 h-12 text-purple-400" />
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
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors">
              <option value="all">All Types</option>
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mb-3 transition-colors">
            <Filter className="w-4 h-4" />
            Advanced Filters (Staff Assignment)
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    Managed By
                  </label>
                  <select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors">
                    <option value="">All Managers</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.firstName} {manager.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-green-400" />
                    Caretaker
                  </label>
                  <select value={caretakerFilter} onChange={(e) => setCaretakerFilter(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors">
                    <option value="">All Caretakers</option>
                    {caretakers.map((caretaker) => (
                      <option key={caretaker.id} value={caretaker.id}>
                        {caretaker.firstName} {caretaker.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-400" />
                    Storekeeper
                  </label>
                  <select value={storekeeperFilter} onChange={(e) => setStorekeeperFilter(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors">
                    <option value="">All Storekeepers</option>
                    {storekeepers.map((storekeeper) => (
                      <option key={storekeeper.id} value={storekeeper.id}>
                        {storekeeper.firstName} {storekeeper.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {(managerFilter || caretakerFilter || storekeeperFilter) && (
            <button onClick={clearAdvancedFilters} className="mt-3 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              Clear staff filters
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-gray-400">
          Showing <span className="text-white font-semibold">{filteredProperties.length}</span> of{" "}
          <span className="text-white font-semibold">{properties.length}</span> properties
        </p>
        <Link href="/dashboard/admin/properties/new">
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/20">
            <Plus className="w-5 h-5 mr-2" />
            Add Property
          </Button>
        </Link>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProperties.map((property, index) => (
          <motion.div key={property.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{property.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span className="line-clamp-1">{property.address}, {property.city}</span>
                </div>
              </div>
              {property.deletedAt && (
                <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-xs rounded-full">
                  Archived
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4 bg-gray-900/30 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Type</span>
                <span className="text-white font-medium px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs">
                  {property.type}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Units</span>
                <span className="text-white font-medium">{property._count?.units || 0}</span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Link href={`/dashboard/properties/${property.id}`} className="flex-1 min-w-[100px]">
                <button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                  <Eye className="w-4 h-4" />
                  <span className="font-medium">View</span>
                </button>
              </Link>

              {!property.deletedAt ? (
                <>
                  <Link href={`/dashboard/admin/properties/${property.id}/edit`}>
                    <button className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-purple-500/20">
                      <Edit className="w-4 h-4" />
                      <span className="font-medium">Edit</span>
                    </button>
                  </Link>
		 <Link href={`/dashboard/admin/properties/${property.id}/payment-settings`}>
		    <button className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-green-500/20">
			<DollarSign className="w-4 h-4" />
			<span className="font-medium">Payment Setup</span>
		    </button>
		</Link>
                  <button
                    onClick={() =>
                      setConfirmModal({
                        isOpen: true,
                        propertyId: property.id,
                        propertyName: property.name,
                        type: "archive",
                      })
                    }
                    className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-yellow-500/20"
                  >
                    <Archive className="w-4 h-4" />
                    <span className="font-medium">Archive</span>
                  </button>
                  <button
                    onClick={() =>
                      setConfirmModal({
                        isOpen: true,
                        propertyId: property.id,
                        propertyName: property.name,
                        type: "delete",
                      })
                    }
                    className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() =>
                    setConfirmModal({
                      isOpen: true,
                      propertyId: property.id,
                      propertyName: property.name,
                      type: "restore",
                    })
                  }
                  className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-green-500/20"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="font-medium">Restore</span>
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl">
          <AlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No properties found</p>
          <p className="text-gray-500 text-sm">Try adjusting your filters</p>
        </motion.div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleConfirmAction}
        propertyName={confirmModal.propertyName}
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
