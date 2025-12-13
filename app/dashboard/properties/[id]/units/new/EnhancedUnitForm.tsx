"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";
import NotificationModal from "./NotificationModal";

interface FormData {
  // Unit fields
  unitNumber: string;
  type: string;
  status: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  floor: string;
  rentAmount: string;
  depositAmount: string;
  
  // Tenant fields (conditional)
  tenantFirstName: string;
  tenantLastName: string;
  tenantEmail: string;
  tenantPhone: string;
  
  // Lease fields (conditional)
  leaseStartDate: string;
  leaseEndDate: string;
  securityDeposit: string;
  monthlyRent: string;
}

export default function EnhancedUnitForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    unitNumber: "",
    type: "TWO_BEDROOM",
    status: "VACANT",
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    floor: "",
    rentAmount: "",
    depositAmount: "",
    tenantFirstName: "",
    tenantLastName: "",
    tenantEmail: "",
    tenantPhone: "",
    leaseStartDate: "",
    leaseEndDate: "",
    securityDeposit: "",
    monthlyRent: "",
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

  // Auto-populate monthly rent when rent amount changes
  useEffect(() => {
    if (formData.rentAmount) {
      setFormData(prev => ({ ...prev, monthlyRent: prev.rentAmount }));
    }
  }, [formData.rentAmount]);

  // Auto-populate security deposit when deposit amount changes
  useEffect(() => {
    if (formData.depositAmount) {
      setFormData(prev => ({ ...prev, securityDeposit: prev.depositAmount }));
    }
  }, [formData.depositAmount]);

  const requiresTenantInfo = formData.status === "OCCUPIED" || formData.status === "RESERVED";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (requiresTenantInfo) {
      if (!formData.tenantFirstName || !formData.tenantLastName || !formData.tenantEmail) {
        setNotification({
          isOpen: true,
          type: "error",
          title: "Validation Error",
          message: "Tenant information is required for OCCUPIED or RESERVED units.",
        });
        return;
      }
      
      if (!formData.leaseStartDate || !formData.leaseEndDate) {
        setNotification({
          isOpen: true,
          type: "error",
          title: "Validation Error",
          message: "Lease dates are required for OCCUPIED or RESERVED units.",
        });
        return;
      }

      // Validate lease dates
      const startDate = new Date(formData.leaseStartDate);
      const endDate = new Date(formData.leaseEndDate);
      
      if (startDate >= endDate) {
        setNotification({
          isOpen: true,
          type: "error",
          title: "Validation Error",
          message: "Lease end date must be after start date.",
        });
        return;
      }

      // For OCCUPIED, start date must be today or in the past
      if (formData.status === "OCCUPIED" && startDate > new Date()) {
        setNotification({
          isOpen: true,
          type: "error",
          title: "Validation Error",
          message: "For OCCUPIED units, lease start date must be today or in the past.",
        });
        return;
      }

      // For RESERVED, start date must be in the future
      if (formData.status === "RESERVED" && startDate <= new Date()) {
        setNotification({
          isOpen: true,
          type: "error",
          title: "Validation Error",
          message: "For RESERVED units, lease start date must be in the future.",
        });
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/properties/${propertyId}/units/create-with-tenant`, {
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
          tenant: requiresTenantInfo ? {
            firstName: formData.tenantFirstName,
            lastName: formData.tenantLastName,
            email: formData.tenantEmail,
            phoneNumber: formData.tenantPhone,
          } : null,
          lease: requiresTenantInfo ? {
            startDate: formData.leaseStartDate,
            endDate: formData.leaseEndDate,
            securityDeposit: formData.securityDeposit ? parseFloat(formData.securityDeposit) : parseFloat(formData.depositAmount || "0"),
            monthlyRent: formData.monthlyRent ? parseFloat(formData.monthlyRent) : parseFloat(formData.rentAmount),
          } : null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setNotification({
          isOpen: true,
          type: "success",
          title: "Unit Created Successfully!",
          message: requiresTenantInfo 
            ? `Unit ${formData.unitNumber} created with tenant ${formData.tenantFirstName} ${formData.tenantLastName} and active lease.`
            : `Unit ${formData.unitNumber} has been created successfully.`,
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
        <Link href={`/dashboard/properties/${propertyId}`}>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* UNIT INFORMATION */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span className="text-purple-400 font-bold">1</span>
            </div>
            Unit Information
          </h3>
          
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
                <option value="OCCUPIED">Occupied</option>
                <option value="MAINTENANCE">Under Maintenance</option>
                <option value="RESERVED">Reserved</option>
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
                Bathrooms <span className="text-gray-500 text-xs">(can be decimal)</span>
              </label>
              <Input
                type="number"
                step="0.5"
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
        </div>

        {/* CONDITIONAL: TENANT INFORMATION */}
        {requiresTenantInfo && (
          <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-700/50 rounded-xl p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold">2</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Tenant Information
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">Required for {formData.status}</span>
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Since this unit is {formData.status}, you must provide tenant details
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                <Input
                  value={formData.tenantFirstName}
                  onChange={(e) => setFormData({ ...formData, tenantFirstName: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                  required={requiresTenantInfo}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                <Input
                  value={formData.tenantLastName}
                  onChange={(e) => setFormData({ ...formData, tenantLastName: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                  required={requiresTenantInfo}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                <Input
                  type="email"
                  value={formData.tenantEmail}
                  onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                  required={requiresTenantInfo}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <Input
                  value={formData.tenantPhone}
                  onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* CONDITIONAL: LEASE INFORMATION */}
        {requiresTenantInfo && (
          <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/50 rounded-xl p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-green-400 font-bold">3</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Lease Information
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Required for {formData.status}</span>
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {formData.status === "OCCUPIED" 
                    ? "Lease start date must be today or in the past"
                    : "Lease start date must be in the future"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Date *</label>
                <Input
                  type="date"
                  value={formData.leaseStartDate}
                  onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                  required={requiresTenantInfo}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">End Date *</label>
                <Input
                  type="date"
                  value={formData.leaseEndDate}
                  onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                  required={requiresTenantInfo}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Monthly Rent (KSH) *
                  <span className="text-gray-500 text-xs ml-2">(Auto-filled from unit rent)</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.monthlyRent}
                  onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                  required={requiresTenantInfo}
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Security Deposit (KSH)
                  <span className="text-gray-500 text-xs ml-2">(Auto-filled from unit deposit)</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.securityDeposit}
                  onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                  min="0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Warning Box for VACANT/MAINTENANCE */}
        {!requiresTenantInfo && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-400 font-semibold text-sm">Unit will be created without tenant</p>
              <p className="text-gray-400 text-sm mt-1">
                Since the status is {formData.status}, no tenant or lease information is required. 
                You can assign a tenant later by editing the unit.
              </p>
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
          >
            {loading ? "Creating..." : "Create Unit"}
          </Button>
          <Link href={`/dashboard/properties/${propertyId}`}>
            <Button type="button" variant="outline" className="border-gray-700 text-gray-400 hover:bg-gray-800">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => {
          setNotification({ ...notification, isOpen: false });
          if (notification.type === "success") {
            router.push(`/dashboard/properties/${propertyId}`);
          }
        }}
      />
    </div>
  );
}
