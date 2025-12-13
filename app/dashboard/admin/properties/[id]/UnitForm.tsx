"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Loader } from "lucide-react";

interface UnitFormProps {
  propertyId: string;
  unit?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UnitForm({ propertyId, unit, onClose, onSuccess }: UnitFormProps) {
  const [formData, setFormData] = useState({
    unitNumber: "",
    type: "TWO_BEDROOM",
    status: "VACANT",
    rentAmount: "",
    depositAmount: "",
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    floor: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (unit) {
      setFormData({
        unitNumber: unit.unitNumber || "",
        type: unit.type || "TWO_BEDROOM",
        status: unit.status || "VACANT",
        rentAmount: unit.rentAmount?.toString() || "",
        depositAmount: unit.depositAmount?.toString() || "",
        bedrooms: unit.bedrooms?.toString() || "",
        bathrooms: unit.bathrooms?.toString() || "",
        squareFeet: unit.squareFeet?.toString() || "",
        floor: unit.floor?.toString() || ""
      });
    }
  }, [unit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        propertyId,
        unitNumber: formData.unitNumber,
        type: formData.type,
        status: formData.status,
        rentAmount: parseFloat(formData.rentAmount),
        depositAmount: formData.depositAmount ? parseFloat(formData.depositAmount) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        squareFeet: formData.squareFeet ? parseInt(formData.squareFeet) : null,
        floor: formData.floor ? parseInt(formData.floor) : null
      };

      const url = unit ? `/api/units/${unit.id}` : `/api/properties/${propertyId}/units`;
      const method = unit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(unit ? "Unit updated successfully!" : "Unit created successfully!");
        onSuccess();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save unit");
      }
    } catch (error) {
      console.error("Error saving unit:", error);
      alert("Error saving unit");
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
          <h3 className="text-2xl font-bold text-cyan-400">
            {unit ? "Edit Unit" : "Add New Unit"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
            <h4 className="text-purple-400 font-semibold mb-4">Basic Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Unit Number * <span className="text-gray-500 text-xs">(e.g., 101, A1, Shop-5)</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.unitNumber}
                  onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g., 101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Unit Type *</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                >
                  <optgroup label="Residential">
                    <option value="STUDIO">Studio</option>
                    <option value="ONE_BEDROOM">1 Bedroom</option>
                    <option value="TWO_BEDROOM">2 Bedrooms</option>
                    <option value="THREE_BEDROOM">3 Bedrooms</option>
                    <option value="PENTHOUSE">Penthouse</option>
                  </optgroup>
                  <optgroup label="Commercial">
                    <option value="SHOP">Shop</option>
                    <option value="OFFICE">Office</option>
                    <option value="WAREHOUSE">Warehouse</option>
                  </optgroup>
                  <optgroup label="Staff">
                    <option value="STAFF_QUARTERS">Staff Quarters</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Status *</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="VACANT">Vacant</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="MAINTENANCE">Under Maintenance</option>
                  <option value="RESERVED">Reserved</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Floor</label>
                <input
                  type="number"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g., 1"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
            <h4 className="text-green-400 font-semibold mb-4">Financial Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Monthly Rent (KES) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.rentAmount}
                  onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g., 15000"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Deposit Amount (KES)
                </label>
                <input
                  type="number"
                  value={formData.depositAmount}
                  onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g., 30000"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Unit Features */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold mb-4">Unit Features</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Bedrooms</label>
                <input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g., 2"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Bathrooms <span className="text-gray-500 text-xs">(can be decimal)</span>
                </label>
                <input
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g., 1.5"
                  min="0"
                  step="0.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Square Feet
                </label>
                <input
                  type="number"
                  value={formData.squareFeet}
                  onChange={(e) => setFormData({ ...formData, squareFeet: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g., 800"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">
              <strong>Note:</strong> Fields marked with * are required. Leave optional fields empty if not applicable.
            </p>
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
              {loading ? "Saving..." : unit ? "Update Unit" : "Create Unit"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
