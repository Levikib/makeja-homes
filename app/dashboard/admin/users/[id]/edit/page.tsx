"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, AlertTriangle, Building2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import NotificationModal from "@/components/NotificationModal";

interface Property {
  id: string;
  name: string;
  city: string;
  type: string;
}

function WarningModal({
  isOpen,
  onClose,
  onConfirm,
  oldProperty,
  newProperty,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  oldProperty: string;
  newProperty: string;
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
            className="bg-gray-800 border border-yellow-500/30 rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-yellow-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">Caretaker Property Change</h3>
                <p className="text-gray-300 mb-4">
                  Caretakers can only manage <strong>ONE property</strong> at a time.
                </p>
                <div className="bg-gray-900/50 rounded-lg p-3 mb-4 space-y-2">
                  <p className="text-sm text-gray-400">
                    <span className="text-red-400">Will stop managing:</span> <strong className="text-white">{oldProperty}</strong>
                  </p>
                  <p className="text-sm text-gray-400">
                    <span className="text-green-400">Will start managing:</span> <strong className="text-white">{newProperty}</strong>
                  </p>
                </div>
                <p className="text-sm text-yellow-400">
                  ⚠️ This change will take effect immediately after saving.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
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
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
              >
                Confirm Change
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [initialProperties, setInitialProperties] = useState<string[]>([]);
  const [originalRole, setOriginalRole] = useState("");
  
  const [showWarning, setShowWarning] = useState(false);
  const [pendingPropertyChange, setPendingPropertyChange] = useState<{
    old: string;
    new: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    role: "CARETAKER",
    isActive: true,
  });

  const [notification, setNotification] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  useEffect(() => {
    // Fetch user data
    fetch(`/api/users/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setFormData({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          phoneNumber: data.phoneNumber || "",
          role: data.role || "CARETAKER",
          isActive: data.isActive ?? true,
        });
        setOriginalRole(data.role || "CARETAKER");

        // Fetch properties for this user
        return fetch("/api/properties/all");
      })
      .then((res) => res.json())
      .then((propData) => {
        const allProps = propData.properties || [];
        setProperties(allProps);

        // Find properties where this user is assigned
        const userProps = allProps
          .filter((p: any) => 
            p.managerIds?.includes(params.id) ||
            p.caretakerIds?.includes(params.id) ||
            p.storekeeperIds?.includes(params.id)
          )
          .map((p: any) => p.id);

        setSelectedProperties(userProps);
        setInitialProperties(userProps);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load data:", error);
        setLoading(false);
      });
  }, [params.id]);

  const handlePropertyToggle = (propertyId: string) => {
    const isCurrentlySelected = selectedProperties.includes(propertyId);
    
    // CARETAKER logic: can only have 1 property
    if (formData.role === "CARETAKER") {
      if (isCurrentlySelected) {
        // Removing current property
        setSelectedProperties([]);
      } else {
        // Adding new property
        if (selectedProperties.length > 0) {
          // Already has a property, show warning
          const oldProperty = properties.find(p => p.id === selectedProperties[0]);
          const newProperty = properties.find(p => p.id === propertyId);
          
          if (oldProperty && newProperty) {
            setPendingPropertyChange({
              old: oldProperty.name,
              new: newProperty.name,
            });
            setShowWarning(true);
            // Store the new property ID to apply after confirmation
            (window as any).__pendingPropertyId = propertyId;
          }
        } else {
          // No property yet, just add it
          setSelectedProperties([propertyId]);
        }
      }
    } else {
      // MANAGER/STOREKEEPER: can have multiple
      if (isCurrentlySelected) {
        setSelectedProperties(selectedProperties.filter(id => id !== propertyId));
      } else {
        setSelectedProperties([...selectedProperties, propertyId]);
      }
    }
  };

  const confirmPropertyChange = () => {
    const newPropertyId = (window as any).__pendingPropertyId;
    if (newPropertyId) {
      setSelectedProperties([newPropertyId]);
      delete (window as any).__pendingPropertyId;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/users/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          propertyIds: selectedProperties,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setNotification({
          isOpen: true,
          type: "success",
          title: "User Updated!",
          message: "User information and property assignments updated successfully.",
        });
        setTimeout(() => {
          router.push(`/dashboard/admin/users/${params.id}`);
        }, 1500);
      } else {
        throw new Error(result.error || "Failed to update user");
      }
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Update Failed",
        message: error.message || "Failed to update user",
      });
    } finally {
      setSaving(false);
    }
  };

  const needsPropertyAssignment = ["MANAGER", "CARETAKER", "STOREKEEPER"].includes(formData.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/admin/users/${params.id}`}>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
          Edit User
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">User Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                First Name *
              </label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Last Name *
              </label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number
              </label>
              <Input
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setFormData({ ...formData, role: newRole });
                  // Reset property selection when changing role
                  if (newRole === "CARETAKER" && selectedProperties.length > 1) {
                    setSelectedProperties([selectedProperties[0]]);
                  }
                }}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              >
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="CARETAKER">Caretaker</option>
                <option value="STOREKEEPER">Storekeeper</option>
                <option value="TECHNICAL">Technical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status *
              </label>
              <select
                value={formData.isActive ? "active" : "inactive"}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "active" })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Property Assignment */}
        {needsPropertyAssignment && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                Assign Properties
              </h3>
              {formData.role === "CARETAKER" && (
                <span className="text-xs text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/30">
                  Max 1 property
                </span>
              )}
            </div>

            {properties.length === 0 ? (
              <p className="text-gray-400 text-sm">No properties available</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {properties.map((property) => {
                  const isSelected = selectedProperties.includes(property.id);
                  const wasInitiallySelected = initialProperties.includes(property.id);
                  
                  return (
                    <label
                      key={property.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-purple-500/10 border-purple-500/50"
                          : "bg-gray-900/50 border-gray-700 hover:border-gray-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handlePropertyToggle(property.id)}
                        className="mt-1 w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium truncate">{property.name}</p>
                          {wasInitiallySelected && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">{property.city}</p>
                        <p className="text-gray-500 text-xs mt-1">{property.type}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {selectedProperties.length > 0 && (
              <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-400">
                  Selected: <span className="text-white font-medium">{selectedProperties.length}</span> {selectedProperties.length === 1 ? 'property' : 'properties'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Link href={`/dashboard/admin/users/${params.id}`}>
            <Button type="button" variant="outline" className="border-gray-700 text-gray-400">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      <WarningModal
        isOpen={showWarning}
        onClose={() => {
          setShowWarning(false);
          setPendingPropertyChange(null);
          delete (window as any).__pendingPropertyId;
        }}
        onConfirm={confirmPropertyChange}
        oldProperty={pendingPropertyChange?.old || ""}
        newProperty={pendingPropertyChange?.new || ""}
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
