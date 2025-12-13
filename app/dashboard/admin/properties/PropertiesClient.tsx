"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit,
  Archive,
  Trash2,
  MapPin,
  Home,
  AlertTriangle,
  X,
  Eye,
  ChevronDown
} from "lucide-react";
import PropertyForm from "./PropertyForm";
import PasswordDialog from "./PasswordDialog";

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
  _count?: {
    units: number;
  };
}

export default function PropertiesClient() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showFilters, setShowFilters] = useState(false);
  
  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [viewProperty, setViewProperty] = useState<Property | null>(null);
  const [archiveProperty, setArchiveProperty] = useState<Property | null>(null);
  const [deleteProperty, setDeleteProperty] = useState<Property | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

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

    // Status filter
    if (statusFilter === "active") {
      filtered = filtered.filter((p) => !p.deletedAt);
    } else if (statusFilter === "archived") {
      filtered = filtered.filter((p) => p.deletedAt);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((p) => p.type === typeFilter);
    }

    // Search
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

  const handleAddNew = () => {
    setEditingProperty(null);
    setShowForm(true);
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setShowForm(true);
  };

  const handleArchive = async () => {
    if (!archiveProperty) return;

    try {
      const res = await fetch(`/api/properties/${archiveProperty.id}/archive`, {
        method: "PATCH"
      });

      if (res.ok) {
        alert("Property archived successfully!");
        fetchProperties();
        setArchiveProperty(null);
      } else {
        alert("Failed to archive property");
      }
    } catch (error) {
      console.error("Error archiving property:", error);
      alert("Error archiving property");
    }
  };

  const handleDelete = async (password: string) => {
    if (!deleteProperty) return;

    try {
      const res = await fetch(`/api/properties/${deleteProperty.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        alert("Property permanently deleted!");
        fetchProperties();
        setDeleteProperty(null);
        setShowPasswordDialog(false);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete property");
      }
    } catch (error) {
      console.error("Error deleting property:", error);
      alert("Error deleting property");
    }
  };

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
          <h2 className="text-2xl font-bold text-cyan-400">Properties</h2>
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
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg text-white hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            <Plus size={20} />
            Add Property
          </button>
        </div>
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
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r border ${getTypeColor(property.type)}`}>
                  <span className="mr-1">{getTypeIcon(property.type)}</span>
                  {property.type.replace("_", " ")}
                </div>
                {property.deletedAt && (
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-gray-500/20 to-slate-500/20 border border-gray-500/30 text-gray-400">
                    ARCHIVED
                  </div>
                )}
              </div>

              {/* Property Name */}
              <h3 className="text-xl font-bold text-white mb-2">{property.name}</h3>

              {/* Address */}
              <div className="flex items-start gap-2 mb-4 text-gray-300">
                <MapPin size={16} className="text-purple-400 mt-1 flex-shrink-0" />
                <div className="text-sm">
                  <p>{property.address}</p>
                  <p className="text-gray-400">
                    {property.city}, {property.state && `${property.state}, `}{property.country}
                  </p>
                </div>
              </div>

              {/* Units Count */}
              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home size={16} className="text-cyan-400" />
                    <span className="text-sm text-gray-400">Total Units</span>
                  </div>
                  <span className="text-2xl font-bold text-cyan-400">{property._count?.units || 0}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-700/50 pt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setViewProperty(property)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20 transition-all text-sm"
                  >
                    <Eye size={14} />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => handleEdit(property)}
                    disabled={!!property.deletedAt}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg text-blue-400 hover:from-blue-500/20 hover:to-purple-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit size={14} />
                    <span>Edit</span>
                  </button>
                </div>

                {!property.deletedAt ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setArchiveProperty(property)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 hover:from-yellow-500/20 hover:to-amber-500/20 transition-all text-sm"
                    >
                      <Archive size={14} />
                      <span>Archive</span>
                    </button>
                    <button
                      onClick={() => {
                        setDeleteProperty(property);
                        setShowPasswordDialog(true);
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 rounded-lg text-red-400 hover:from-red-500/20 hover:to-rose-500/20 transition-all text-sm"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      // Restore functionality can be added here
                      alert("Restore functionality coming soon!");
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg text-green-400 hover:from-green-500/20 hover:to-emerald-500/20 transition-all text-sm"
                  >
                    <span>Restore</span>
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Property Form Modal */}
      {showForm && (
        <PropertyForm
          property={editingProperty}
          onClose={() => {
            setShowForm(false);
            setEditingProperty(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingProperty(null);
            fetchProperties();
          }}
        />
      )}

      {/* View Modal */}
      <AnimatePresence>
        {viewProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setViewProperty(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-cyan-500/30 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-cyan-400">Property Details</h3>
                <button onClick={() => setViewProperty(null)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm">Property Name</label>
                  <p className="text-white text-lg font-semibold">{viewProperty.name}</p>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Type</label>
                  <p className="text-white">{viewProperty.type.replace("_", " ")}</p>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Address</label>
                  <p className="text-white">{viewProperty.address}</p>
                  <p className="text-gray-400">{viewProperty.city}, {viewProperty.state && `${viewProperty.state}, `}{viewProperty.country}</p>
                  {viewProperty.postalCode && <p className="text-gray-400">{viewProperty.postalCode}</p>}
                </div>

                {viewProperty.description && (
                  <div>
                    <label className="text-gray-400 text-sm">Description</label>
                    <p className="text-white">{viewProperty.description}</p>
                  </div>
                )}

                <div>
                  <label className="text-gray-400 text-sm">Total Units</label>
                  <p className="text-white text-2xl font-bold">{viewProperty._count?.units || 0}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setViewProperty(null)}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archive Confirmation Modal */}
      <AnimatePresence>
        {archiveProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setArchiveProperty(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-yellow-500/30 rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <Archive size={32} className="text-yellow-400" />
                <h3 className="text-2xl font-bold text-yellow-400">Archive Property</h3>
              </div>

              <p className="text-gray-300 mb-4">
                Are you sure you want to archive <strong className="text-white">{archiveProperty.name}</strong>? This will hide the property but keep all historical data intact.
              </p>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-yellow-400 text-sm">
                  <strong>Note:</strong> Archived properties can be restored later from the Archived filter.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setArchiveProperty(null)}
                  className="px-6 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchive}
                  className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-lg text-white hover:from-yellow-600 hover:to-amber-600 transition-all"
                >
                  Archive Property
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Dialog for Delete */}
      {showPasswordDialog && deleteProperty && (
        <PasswordDialog
          title="Delete Property Permanently"
          message={`You are about to PERMANENTLY DELETE "${deleteProperty.name}" and ALL associated data (units, tenants, leases, payments, etc.). This action CANNOT be undone.`}
          onConfirm={handleDelete}
          onCancel={() => {
            setShowPasswordDialog(false);
            setDeleteProperty(null);
          }}
        />
      )}
    </div>
  );
}
