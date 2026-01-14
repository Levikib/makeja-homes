"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, AlertTriangle, Building2, Lock } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [originalRole, setOriginalRole] = useState<string>("");
  const [showWarning, setShowWarning] = useState(false);
  const [pendingPropertyChange, setPendingPropertyChange] = useState<string>("");
  const [notification, setNotification] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    role: "CARETAKER",
    isActive: true,
  });

  const isUserInactive = !formData.isActive;

  useEffect(() => {
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

        // Fetch properties (excluding archived)
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
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setNotification({
          isOpen: true,
          type: "error",
          title: "Error",
          message: "Failed to load user data",
        });
      });
  }, [params.id]);

  const handlePropertyToggle = (propertyId: string) => {
    if (isUserInactive) return; // Prevent changes for inactive users

    if (formData.role === "CARETAKER") {
      if (selectedProperties.includes(propertyId)) {
        setSelectedProperties([]);
      } else {
        if (selectedProperties.length > 0) {
          const oldProperty = properties.find(p => p.id === selectedProperties[0]);
          const newProperty = properties.find(p => p.id === propertyId);
          
          if (oldProperty && newProperty) {
            setPendingPropertyChange(propertyId);
            setShowWarning(true);
            return;
          }
        }
        setSelectedProperties([propertyId]);
      }
    } else {
      setSelectedProperties((prev) =>
        prev.includes(propertyId)
          ? prev.filter((id) => id !== propertyId)
          : [...prev, propertyId]
      );
    }
  };

  const confirmPropertyChange = () => {
    setSelectedProperties([pendingPropertyChange]);
    setPendingPropertyChange("");
  };

  const handleRoleChange = (newRole: string) => {
    if (isUserInactive) return; // Prevent changes for inactive users

    setFormData({ ...formData, role: newRole });
    
    if (newRole === "CARETAKER" && selectedProperties.length > 1) {
      setSelectedProperties([selectedProperties[0]]);
      setNotification({
        isOpen: true,
        type: "success",
        title: "Property Limit",
        message: "Caretakers can only manage one property. First property kept.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUserInactive) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Cannot Edit",
        message: "Inactive users cannot be edited. Please activate the user first from the users list.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/users/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          propertyIds: selectedProperties,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user");
      }

      setNotification({
        isOpen: true,
        type: "success",
        title: "Success!",
        message: "User updated successfully",
      });

      setTimeout(() => {
        router.push("/dashboard/admin/users");
      }, 1500);
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: error.message || "Failed to update user",
      });
    } finally {
      setLoading(false);
    }
  };

  const oldPropertyName = properties.find(p => p.id === selectedProperties[0])?.name || "";
  const newPropertyName = properties.find(p => p.id === pendingPropertyChange)?.name || "";

  return (
    <div className="space-y-6 p-8">
      <div>
        <Link
          href="/dashboard/admin/users"
          className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Users
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Edit User</h1>
            <p className="text-gray-400 text-lg">
              Update user information and permissions
            </p>
          </div>
          
          {/* Inactive User Warning */}
          {isUserInactive && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
              <Lock className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-red-400 font-semibold">User Inactive - Read Only</p>
                <p className="text-red-300 text-sm">Activate user from the users list to edit</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                First Name *
              </label>
              <Input
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={isUserInactive}
                className="bg-gray-900 border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Last Name *
              </label>
              <Input
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={isUserInactive}
                className="bg-gray-900 border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isUserInactive}
                className="bg-gray-900 border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number
              </label>
              <Input
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                disabled={isUserInactive}
                className="bg-gray-900 border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Role Selection */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Role</h3>
          <div className="grid grid-cols-3 gap-4">
            {["MANAGER", "CARETAKER", "STOREKEEPER"].map((role) => (
              <button
                key={role}
                type="button"
                disabled={isUserInactive}
                onClick={() => handleRoleChange(role)}
                className={`p-4 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  formData.role === role
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className="text-white font-medium">{role}</div>
              </button>
            ))}
          </div>
          {formData.role === "CARETAKER" && (
            <p className="text-sm text-yellow-400 mt-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Caretakers can only manage ONE property at a time
            </p>
          )}
        </div>

        {/* Property Assignment */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Assign Properties
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {formData.role === "CARETAKER" 
                  ? "Select the property this caretaker will manage"
                  : "Select properties this user will have access to"}
              </p>
            </div>
            <div className="text-sm text-purple-400">
              Selected: <span className="text-white font-medium">{selectedProperties.length}</span> {selectedProperties.length === 1 ? 'property' : 'properties'}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {properties.length === 0 ? (
              <p className="text-gray-400 text-sm">No properties available</p>
            ) : (
              properties.map((property) => {
                const isSelected = selectedProperties.includes(property.id);
                
                return (
                  <button
                    key={property.id}
                    type="button"
                    disabled={isUserInactive}
                    onClick={() => handlePropertyToggle(property.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className="font-medium text-white">{property.name}</div>
                    <div className="text-sm text-gray-400">{property.city}</div>
                    <div className="text-xs text-gray-500 mt-1">{property.type}</div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 justify-end">
          <Link href="/dashboard/admin/users">
            <Button type="button" variant="outline" className="border-gray-700">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading || isUserInactive}
            className="bg-gradient-to-r from-purple-600 to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Updating..." : "Update User"}
          </Button>
        </div>
      </form>

      <WarningModal
        isOpen={showWarning}
        onClose={() => {
          setShowWarning(false);
          setPendingPropertyChange("");
        }}
        onConfirm={confirmPropertyChange}
        oldProperty={oldPropertyName}
        newProperty={newPropertyName}
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
