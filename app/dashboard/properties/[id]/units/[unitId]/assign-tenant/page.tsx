"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, FileText, AlertCircle, IdCard } from "lucide-react";
import NotificationModal from "@/components/NotificationModal";
import Link from "next/link";

interface Unit {
  id: string;
  unitNumber: string;
  type: string;
  status: string;
  rentAmount: number;
  depositAmount: number | null;
  properties: {
    name: string;
  };
}

export default function AssignTenantPage({
  params
}: {
  params: { id: string; unitId: string }
}) {
  const router = useRouter();
  const { id: propertyId, unitId } = params;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [unit, setUnit] = useState<Unit | null>(null);
  
  const [notification, setNotification] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  const [formData, setFormData] = useState({
    tenantFirstName: "",
    tenantLastName: "",
    tenantEmail: "",
    tenantPhone: "",
    tenantIdNumber: "",
    leaseStartDate: "",
    leaseEndDate: "",
    monthlyRent: "",
    securityDeposit: "",
  });

  useEffect(() => {
    const fetchUnit = async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}/units/${unitId}`);
        const data = await res.json();
        setUnit(data);
        
        // Pre-fill rent amounts
        setFormData(prev => ({
          ...prev,
          monthlyRent: data.rentAmount?.toString() || "",
          securityDeposit: data.depositAmount?.toString() || "",
        }));
      } catch (error) {
        console.error("Failed to fetch unit:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnit();
  }, [propertyId, unitId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/properties/${propertyId}/units/${unitId}/assign-tenant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.tenantFirstName,
          lastName: formData.tenantLastName,
          email: formData.tenantEmail,
          phoneNumber: formData.tenantPhone,
          idNumber: formData.tenantIdNumber,
          leaseStartDate: formData.leaseStartDate,
          leaseEndDate: formData.leaseEndDate,
          rentAmount: parseFloat(formData.monthlyRent),
          depositAmount: parseFloat(formData.securityDeposit),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setNotification({
          isOpen: true,
          type: "success",
          title: "Tenant Assigned!",
          message: "Tenant has been successfully assigned to this unit.",
        });
        
        setTimeout(() => {
          router.push(`/dashboard/properties/${propertyId}/units/${unitId}`);
        }, 1500);
      } else {
        throw new Error(data.error || "Failed to assign tenant");
      }
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Assignment Failed",
        message: error.message || "Failed to assign tenant. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading unit details...</p>
        </div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-400">Unit not found</p>
          <Link href={`/dashboard/properties/${propertyId}`}>
            <Button className="mt-4">Back to Property</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/dashboard/properties/${propertyId}/units/${unitId}`}>
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Unit
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Assign Tenant</h1>
          <p className="text-gray-400">
            {unit.properties.name} - Unit {unit.unitNumber}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant Information */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400" />
              Tenant Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Name *
                </label>
                <Input
                  required
                  value={formData.tenantFirstName}
                  onChange={(e) => setFormData({ ...formData, tenantFirstName: e.target.value })}
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name *
                </label>
                <Input
                  required
                  value={formData.tenantLastName}
                  onChange={(e) => setFormData({ ...formData, tenantLastName: e.target.value })}
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <Input
                  type="email"
                  required
                  value={formData.tenantEmail}
                  onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number *
                </label>
                <Input
                  required
                  value={formData.tenantPhone}
                  onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ID Number *
                </label>
                <Input
                  required
                  value={formData.tenantIdNumber}
                  onChange={(e) => setFormData({ ...formData, tenantIdNumber: e.target.value })}
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Lease Details */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Lease Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lease Start Date *
                </label>
                <Input
                  type="date"
                  required
                  value={formData.leaseStartDate}
                  onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lease End Date *
                </label>
                <Input
                  type="date"
                  required
                  value={formData.leaseEndDate}
                  onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Monthly Rent (KSH) *
                </label>
                <Input
                  type="number"
                  required
                  value={formData.monthlyRent}
                  onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Security Deposit (KSH) *
                </label>
                <Input
                  type="number"
                  required
                  value={formData.securityDeposit}
                  onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 justify-end">
            <Link href={`/dashboard/properties/${propertyId}/units/${unitId}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {submitting ? "Assigning..." : "Assign Tenant"}
            </Button>
          </div>
        </form>
      </div>

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
