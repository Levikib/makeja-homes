"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  MapPin,
  Edit,
  Plus,
  Home,
  User,
  Trash2,
  DoorOpen,
  BedDouble,
  Bath,
  Ruler,
  DollarSign,
  ArrowLeft,
  Users,
  UserCog
} from "lucide-react";
import { useRouter } from "next/navigation";
import PropertyEditForm from "./PropertyEditForm";
import UnitForm from "./UnitForm";

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
  managerId?: string;
  caretakerId?: string;
  manager?: { id: string; name: string; email: string };
  caretaker?: { id: string; name: string; email: string };
  units: Unit[];
}

interface Unit {
  id: string;
  unitNumber: string;
  type: string;
  status: string;
  rentAmount: number;
  depositAmount?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  floor?: number;
  tenantId?: string;
  tenant?: {
    id: string;
    user: {
      name: string;
      email: string;
    };
  };
}

export default function PropertyDetailsClient({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  useEffect(() => {
    fetchProperty();
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/details`);
      if (res.ok) {
        const data = await res.json();
        setProperty(data);
      }
    } catch (error) {
      console.error("Failed to fetch property:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm("Are you sure you want to delete this unit? This will also delete all associated leases and payments.")) {
      return;
    }
    
    try {
      const res = await fetch(`/api/units/${unitId}`, { method: "DELETE" });
      if (res.ok) {
        alert("Unit deleted successfully!");
        fetchProperty();
      } else {
        alert("Failed to delete unit");
      }
    } catch (error) {
      console.error("Error deleting unit:", error);
      alert("Error deleting unit");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OCCUPIED":
        return "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400";
      case "VACANT":
        return "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400";
      case "MAINTENANCE":
        return "from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-400";
      case "RESERVED":
        return "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400";
      default:
        return "from-gray-500/20 to-slate-500/20 border-gray-500/30 text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-cyan-400 text-xl">Loading property details...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <Building2 size={64} className="mx-auto text-gray-600 mb-4" />
        <h3 className="text-xl font-semibold text-gray-400 mb-2">Property not found</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/admin/properties")}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-cyan-400">{property.name}</h2>
            <p className="text-gray-400 text-sm mt-1">{property.type.replace("_", " ")}</p>
          </div>
        </div>
        <button
          onClick={() => setShowEditForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg text-white hover:from-cyan-600 hover:to-blue-600 transition-all"
        >
          <Edit size={20} />
          Edit Property
        </button>
      </div>

      {/* Property Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Location Card */}
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <MapPin size={24} className="text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Location</h3>
          </div>
          <div className="space-y-2 text-gray-300">
            <p>{property.address}</p>
            <p>{property.city}, {property.state && `${property.state}, `}{property.country}</p>
            {property.postalCode && <p className="text-gray-400">{property.postalCode}</p>}
          </div>
        </div>

        {/* Manager Card */}
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserCog size={24} className="text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Manager</h3>
          </div>
          {property.manager ? (
            <div className="space-y-1">
              <p className="text-white font-semibold">{property.manager.name}</p>
              <p className="text-gray-400 text-sm">{property.manager.email}</p>
            </div>
          ) : (
            <p className="text-gray-500">No manager assigned</p>
          )}
        </div>

        {/* Caretaker Card */}
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-green-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users size={24} className="text-green-400" />
            <h3 className="text-lg font-semibold text-white">Caretaker</h3>
          </div>
          {property.caretaker ? (
            <div className="space-y-1">
              <p className="text-white font-semibold">{property.caretaker.name}</p>
              <p className="text-gray-400 text-sm">{property.caretaker.email}</p>
            </div>
          ) : (
            <p className="text-gray-500">No caretaker assigned</p>
          )}
        </div>
      </div>

      {/* Description */}
      {property.description && (
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
          <p className="text-gray-300">{property.description}</p>
        </div>
      )}

      {/* Units Section */}
      <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-cyan-400">Units</h3>
            <p className="text-gray-400 text-sm mt-1">{property.units.length} total units</p>
          </div>
          <button
            onClick={() => {
              setEditingUnit(null);
              setShowUnitForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg text-white hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            <Plus size={20} />
            Add Unit
          </button>
        </div>

        {property.units.length === 0 ? (
          <div className="text-center py-12">
            <Home size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No units added yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {property.units.map((unit) => (
              <motion.div
                key={unit.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 border border-gray-600/30 rounded-lg p-4 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <DoorOpen size={20} className="text-cyan-400" />
                    <span className="text-white font-bold text-lg">{unit.unitNumber}</span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r border ${getStatusColor(unit.status)}`}>
                    {unit.status}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="text-gray-400">Type:</span>
                    <span>{unit.type}</span>
                  </div>
                  
                  {unit.bedrooms !== null && unit.bedrooms !== undefined && (
                    <div className="flex items-center justify-between text-gray-300">
                      <span className="flex items-center gap-1 text-gray-400">
                        <BedDouble size={14} />
                        Bedrooms:
                      </span>
                      <span>{unit.bedrooms}</span>
                    </div>
                  )}

                  {unit.bathrooms !== null && unit.bathrooms !== undefined && (
                    <div className="flex items-center justify-between text-gray-300">
                      <span className="flex items-center gap-1 text-gray-400">
                        <Bath size={14} />
                        Bathrooms:
                      </span>
                      <span>{unit.bathrooms}</span>
                    </div>
                  )}

                  {unit.squareFeet && (
                    <div className="flex items-center justify-between text-gray-300">
                      <span className="flex items-center gap-1 text-gray-400">
                        <Ruler size={14} />
                        Sq Ft:
                      </span>
                      <span>{unit.squareFeet}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-600/50 pt-2 mt-2">
                    <div className="flex items-center justify-between text-cyan-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <DollarSign size={14} />
                        Rent:
                      </span>
                      <span>KES {unit.rentAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {unit.tenant && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded p-2 mt-2">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-green-400" />
                        <div className="text-xs">
                          <p className="text-green-400 font-semibold">{unit.tenant.user.name}</p>
                          <p className="text-gray-400">{unit.tenant.user.email}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={() => {
                      setEditingUnit(unit);
                      setShowUnitForm(true);
                    }}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/20 transition-all text-xs"
                  >
                    <Edit size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteUnit(unit.id)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 hover:bg-red-500/20 transition-all text-xs"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Property Form */}
      {showEditForm && (
        <PropertyEditForm
          property={property}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            fetchProperty();
          }}
        />
      )}

      {/* Unit Form */}
      {showUnitForm && (
        <UnitForm
          propertyId={propertyId}
          unit={editingUnit}
          onClose={() => {
            setShowUnitForm(false);
            setEditingUnit(null);
          }}
          onSuccess={() => {
            setShowUnitForm(false);
            setEditingUnit(null);
            fetchProperty();
          }}
        />
      )}
    </div>
  );
}
