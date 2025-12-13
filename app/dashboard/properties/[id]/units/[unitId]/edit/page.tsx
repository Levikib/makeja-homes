"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Home, DollarSign, BedDouble, Bath, Ruler } from "lucide-react";
import Link from "next/link";
import NotificationModal from "./NotificationModal";

export default function EditUnitPage({
  params,
}: {
  params: { id: string; unitId: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [unitInfo, setUnitInfo] = useState<any>(null);
  
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
    fetch(`/api/properties/${params.id}/units/${params.unitId}`)
      .then((res) => res.json())
      .then((data) => {
        setUnitInfo(data);
        
        setFormData({
          unitNumber: data.unitNumber || "",
          type: data.type || "TWO_BEDROOM",
          status: data.status || "VACANT",
          bedrooms: data.bedrooms !== null && data.bedrooms !== undefined ? data.bedrooms.toString() : "",
          bathrooms: data.bathrooms !== null && data.bathrooms !== undefined ? data.bathrooms.toString() : "",
          squareFeet: data.squareFeet !== null && data.squareFeet !== undefined ? data.squareFeet.toString() : "",
          floor: data.floor !== null && data.floor !== undefined ? data.floor.toString() : "",
          rentAmount: data.rentAmount !== null && data.rentAmount !== undefined ? data.rentAmount.toString() : "",
          depositAmount: data.depositAmount !== null && data.depositAmount !== undefined ? data.depositAmount.toString() : "",
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error("❌ Failed to load unit:", error);
        setNotification({
          isOpen: true,
          type: "error",
          title: "Failed to Load Unit",
          message: "Could not fetch unit details. Please try again.",
        });
        setLoading(false);
      });
  }, [params.id, params.unitId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/properties/${params.id}/units/${params.unitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitNumber: formData.unitNumber,
          type: formData.type,
          status: formData.status,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
          squareFeet: formData.squareFeet ? parseInt(formData.squareFeet) : null,
          floor: formData.floor ? parseInt(formData.floor) : null,
          rentAmount: parseFloat(formData.rentAmount),
          depositAmount: formData.depositAmount ? parseFloat(formData.depositAmount) : null,
        }),
      });

      if (response.ok) {
        setNotification({
          isOpen: true,
          type: "success",
          title: "Unit Updated Successfully!",
          message: `Unit ${formData.unitNumber} has been updated with your changes.`,
        });
      } else {
        const error = await response.json();
        setNotification({
          isOpen: true,
          type: "error",
          title: "Update Failed",
          message: error.error || "Failed to update unit. Please try again.",
        });
      }
    } catch (error) {
      console.error("Failed to update unit:", error);
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-lg">Loading unit...</div>
      </div>
    );
  }

  const displayValue = (value: any, fallback: string = "-") => {
    if (value === null || value === undefined || value === "") return fallback;
    return value;
  };

  const getTenantData = () => {
    if (unitInfo?.tenants && unitInfo.tenants.length > 0) {
      const tenant = unitInfo.tenants[0];
      if (tenant.users) {
        const user = tenant.users;
        return {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
          email: user.email,
          phoneNumber: user.phoneNumber
        };
      }
    }
    return null;
  };

  const tenantData = getTenantData();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/properties/${params.id}/units/${params.unitId}`}>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">
            Edit Unit {unitInfo?.unitNumber || formData.unitNumber || ""}
          </h1>
          {unitInfo && unitInfo.properties && (
            <p className="text-gray-400 mt-1">
              {unitInfo.properties.name}
            </p>
          )}
        </div>
      </div>

      {unitInfo && (
        <div className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
            <Home className="w-5 h-5" />
            Current Unit Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide">Basic Details</p>
              <div className="space-y-2">
                <div>
                  <p className="text-gray-500 text-sm">Unit Number</p>
                  <p className="text-white font-semibold text-lg">{displayValue(unitInfo.unitNumber)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Type</p>
                  <p className="text-cyan-400 font-medium">
                    {displayValue(unitInfo.type?.replace(/_/g, ' '))}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Status</p>
                  <p className={`font-medium ${
                    unitInfo.status === 'OCCUPIED' ? 'text-green-400' : 
                    unitInfo.status === 'VACANT' ? 'text-blue-400' : 
                    unitInfo.status === 'MAINTENANCE' ? 'text-yellow-400' :
                    'text-gray-400'
                  }`}>
                    {displayValue(unitInfo.status)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Floor</p>
                  <p className="text-white">{displayValue(unitInfo.floor)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide">Financial</p>
              <div className="space-y-2">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <p className="text-gray-400 text-sm flex items-center gap-1">
                    <DollarSign size={14} />
                    Monthly Rent
                  </p>
                  <p className="text-green-400 font-bold text-xl">
                    KSH {unitInfo.rentAmount ? unitInfo.rentAmount.toLocaleString() : "0"}
                  </p>
                </div>
                {unitInfo.depositAmount !== null && unitInfo.depositAmount !== undefined && unitInfo.depositAmount > 0 ? (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                      <DollarSign size={14} />
                      Deposit
                    </p>
                    <p className="text-blue-400 font-bold text-xl">
                      KSH {unitInfo.depositAmount.toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Deposit</p>
                    <p className="text-gray-500 italic">Not set</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide">Features</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-gray-700/30 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <BedDouble size={16} className="text-purple-400" />
                    <span className="text-gray-400 text-sm">Bedrooms</span>
                  </div>
                  <span className="text-white font-semibold">
                    {displayValue(unitInfo.bedrooms)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-gray-700/30 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <Bath size={16} className="text-blue-400" />
                    <span className="text-gray-400 text-sm">Bathrooms</span>
                  </div>
                  <span className="text-white font-semibold">
                    {displayValue(unitInfo.bathrooms)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-gray-700/30 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <Ruler size={16} className="text-orange-400" />
                    <span className="text-gray-400 text-sm">Sq Ft</span>
                  </div>
                  <span className="text-white font-semibold">
                    {displayValue(unitInfo.squareFeet)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide">Occupancy</p>
              {tenantData ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <p className="text-green-400 font-semibold mb-2">Occupied</p>
                  <div className="space-y-1">
                    <p className="text-white text-sm font-medium">{tenantData.name}</p>
                    <p className="text-gray-400 text-xs">{tenantData.email}</p>
                    {tenantData.phoneNumber && (
                      <p className="text-gray-400 text-xs">{tenantData.phoneNumber}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-400 font-semibold">Vacant</p>
                  <p className="text-gray-400 text-sm mt-1">No tenant assigned</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <p className="text-gray-500 text-xs">
              💡 <strong>Tip:</strong> The values above show the current state. Form fields below are pre-filled - only change what you need to update.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-purple-400">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Unit Number *
              </label>
              <Input
                value={formData.unitNumber}
                onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type *
              </label>
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              >
                <option value="VACANT">Vacant</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="MAINTENANCE">Under Maintenance</option>
                <option value="RESERVED">Reserved</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Floor
              </label>
              <Input
                type="number"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                placeholder="e.g., 1"
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-green-400">Financial Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Monthly Rent (KSH) *
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.rentAmount}
                onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                required
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Deposit Amount (KSH)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                placeholder="e.g., 90000"
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-blue-400">Unit Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bedrooms
              </label>
              <Input
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                placeholder="e.g., 2"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bathrooms <span className="text-gray-500 text-xs">(can be decimal)</span>
              </label>
              <Input
                type="number"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                placeholder="e.g., 1.5"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Square Feet
              </label>
              <Input
                type="number"
                value={formData.squareFeet}
                onChange={(e) => setFormData({ ...formData, squareFeet: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                placeholder="e.g., 800"
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            <strong>Note:</strong> All fields are pre-filled with current values. Only change what you need to update, then click Save Changes.
          </p>
        </div>

        <div className="flex gap-4 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Link href={`/dashboard/properties/${params.id}/units/${params.unitId}`}>
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
            router.push(`/dashboard/properties/${params.id}/units/${params.unitId}`);
          }
        }}
      />
    </div>
  );
}
