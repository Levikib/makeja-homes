"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import NotificationModal from "./NotificationModal";

export default function NewUnitPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    unitNumber: "",
    type: "TWO_BEDROOM",
    status: "VACANT",
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    floor: "",
    rentAmount: "",
    depositAmount: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/properties/${params.id}/units/create-with-tenant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit: {
            unitNumber: formData.unitNumber,
            type: formData.type,
            status: formData.status,
            bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
            bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
            squareFeet: formData.squareFeet ? parseInt(formData.squareFeet) : null,
            floor: formData.floor ? parseInt(formData.floor) : null,
            rentAmount: parseFloat(formData.rentAmount),
            depositAmount: formData.depositAmount ? parseFloat(formData.depositAmount) : null,
          },
        }),
      });

      if (response.ok) {
        setNotification({
          isOpen: true,
          type: "success",
          title: "Unit Created Successfully!",
          message: `Unit ${formData.unitNumber} has been created.`,
        });
      } else {
        const error = await response.json();
        setNotification({
          isOpen: true,
          type: "error",
          title: "Creation Failed",
          message: error.error || "Failed to create unit. Please try again.",
        });
      }
    } catch (error) {
      console.error("Failed to create unit:", error);
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/properties/${params.id}`}>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Property
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
            Create New Unit
          </h1>
          <p className="text-gray-400 mt-1">Add a new unit to this property</p>
        </div>
      </div>

      {(formData.status === "OCCUPIED" || formData.status === "RESERVED") && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-semibold text-sm">Notice: Simplified Unit Creation</p>
            <p className="text-gray-300 text-sm mt-1">
              For now, create units as VACANT then assign tenants separately through the tenant management section.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Unit Number * <span className="text-gray-500 text-xs">(e.g., 101, A1, Shop-5)</span>
            </label>
            <Input
              value={formData.unitNumber}
              onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
            >
              <option value="VACANT">Vacant</option>
              <option value="MAINTENANCE">Under Maintenance</option>
              <option value="OCCUPIED" disabled>Occupied (assign tenant separately)</option>
              <option value="RESERVED" disabled>Reserved (assign tenant separately)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Floor</label>
            <Input
              type="number"
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Rent (KSH) *</label>
            <Input
              type="number"
              step="0.01"
              value={formData.rentAmount}
              onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              required
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Deposit Amount (KSH)</label>
            <Input
              type="number"
              step="0.01"
              value={formData.depositAmount}
              onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Bedrooms</label>
            <Input
              type="number"
              value={formData.bedrooms}
              onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bathrooms 
            </label>
            <Input
              type="number"
              step="1"
              value={formData.bathrooms}
              onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Square Feet</label>
            <Input
              type="number"
              value={formData.squareFeet}
              onChange={(e) => setFormData({ ...formData, squareFeet: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              min="0"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
          >
            {loading ? "Creating..." : "Create Unit"}
          </Button>
          <Link href={`/dashboard/properties/${params.id}`}>
            <Button type="button" variant="outline" className="border-gray-700 text-gray-400 hover:bg-gray-800">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => {
          setNotification({ ...notification, isOpen: false });
          if (notification.type === "success") {
            router.push(`/dashboard/properties/${params.id}`);
          }
        }}
      />
    </div>
  );
}
