"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Loader } from "lucide-react";

interface PropertyEditFormProps {
  property: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PropertyEditForm({ property, onClose, onSuccess }: PropertyEditFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    country: "Kenya",
    postalCode: "",
    type: "RESIDENTIAL",
    description: "",
    managerIds: [] as string[],
    caretakerIds: [] as string[],
    storekeeperIds: [] as string[]
  });
  const [managers, setManagers] = useState<any[]>([]);
  const [caretakers, setCaretakers] = useState<any[]>([]);
  const [storekeepers, setStorekeepers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name || "",
        address: property.address || "",
        city: property.city || "",
        state: property.state || "",
        country: property.country || "Kenya",
        postalCode: property.postalCode || "",
        type: property.type || "RESIDENTIAL",
        description: property.description || "",
        managerIds: property.managerIds || [],
        caretakerIds: property.caretakerIds || [],
        storekeeperIds: property.storekeeperIds || []
      });
    }
    fetchUsers();
  }, [property]);

  const fetchUsers = async () => {
    try {
      const [managersRes, caretakersRes, storekeepersRes] = await Promise.all([
        fetch("/api/users?role=MANAGER&status=active"),
        fetch("/api/users?role=CARETAKER&status=active&available=true"),
        fetch("/api/users?role=STOREKEEPER&status=active")
      ]);
      
      if (managersRes.ok) setManagers(await managersRes.json());
      if (caretakersRes.ok) setCaretakers(await caretakersRes.json());
      if (storekeepersRes.ok) setStorekeepers(await storekeepersRes.json());
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert("Property updated successfully!");
        onSuccess();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update property");
      }
    } catch (error) {
      console.error("Error updating property:", error);
      alert("Error updating property");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-gray-900 to-gray-800 border border-cyan-500/30 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-2xl font-bold text-cyan-400">Edit Property</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
            <h4 className="text-purple-400 font-semibold mb-4">Basic Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">Property Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">Type *</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="MIXED_USE">Mixed Use</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold mb-4">Location</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">State/County</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Country *</label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Postal Code</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Staff Assignment */}
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
            <h4 className="text-green-400 font-semibold mb-4">Staff Assignment</h4>
            
            {loadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <Loader className="animate-spin text-cyan-400" size={24} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Managers</label>
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                    {loadingUsers ? (
                      <p className="text-gray-500 text-sm">Loading...</p>
                    ) : managers.length === 0 ? (
                      <p className="text-gray-500 text-sm">No managers available</p>
                    ) : (
                      <div className="space-y-2">
                        {managers.map((manager) => (
                          <label key={manager.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={formData.managerIds.includes(manager.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, managerIds: [...formData.managerIds, manager.id] });
                                } else {
                                  setFormData({ ...formData, managerIds: formData.managerIds.filter(id => id !== manager.id) });
                                }
                              }}
                              className="w-4 h-4 text-cyan-500 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500"
                            />
                            <span className="text-white text-sm">{manager.name}</span>
                            <span className="text-gray-400 text-xs">({manager.email})</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formData.managerIds.length} selected</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Caretakers</label>
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                    {loadingUsers ? (
                      <p className="text-gray-500 text-sm">Loading...</p>
                    ) : caretakers.length === 0 ? (
                      <p className="text-gray-500 text-sm">No caretakers available</p>
                    ) : (
                      <div className="space-y-2">
                        {caretakers.map((caretaker) => (
                          <label key={caretaker.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={formData.caretakerIds.includes(caretaker.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, caretakerIds: [...formData.caretakerIds, caretaker.id] });
                                } else {
                                  setFormData({ ...formData, caretakerIds: formData.caretakerIds.filter(id => id !== caretaker.id) });
                                }
                              }}
                              className="w-4 h-4 text-cyan-500 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500"
                            />
                            <span className="text-white text-sm">{caretaker.name}</span>
                            <span className="text-gray-400 text-xs">({caretaker.email})</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formData.caretakerIds.length} selected</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Storekeepers</label>
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                    {loadingUsers ? (
                      <p className="text-gray-500 text-sm">Loading...</p>
                    ) : storekeepers.length === 0 ? (
                      <p className="text-gray-500 text-sm">No storekeepers available</p>
                    ) : (
                      <div className="space-y-2">
                        {storekeepers.map((storekeeper) => (
                          <label key={storekeeper.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={formData.storekeeperIds.includes(storekeeper.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, storekeeperIds: [...formData.storekeeperIds, storekeeper.id] });
                                } else {
                                  setFormData({ ...formData, storekeeperIds: formData.storekeeperIds.filter(id => id !== storekeeper.id) });
                                }
                              }}
                              className="w-4 h-4 text-cyan-500 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500"
                            />
                            <span className="text-white text-sm">{storekeeper.name}</span>
                            <span className="text-gray-400 text-xs">({storekeeper.email})</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formData.storekeeperIds.length} selected</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              placeholder="Additional property details..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg text-white hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader className="animate-spin" size={16} />}
              {loading ? "Updating..." : "Update Property"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
