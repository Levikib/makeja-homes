"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, FileText, AlertCircle, IdCard } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [unit, setUnit] = useState<Unit | null>(null);

  const [formData, setFormData] = useState({
    tenantFirstName: "",
    tenantLastName: "",
    tenantEmail: "",
    tenantPhone: "",
    tenantIdNumber: "", // ADDED: National ID
    leaseStartDate: "",
    leaseEndDate: "",
    monthlyRent: "",
    securityDeposit: "",
  });

  const [notification, setNotification] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({
    show: false,
    type: "success",
    message: "",
  });

  useEffect(() => {
    fetch(`/api/properties/${params.id}/units/${params.unitId}`)
      .then((res) => res.json())
      .then((data) => {
        setUnit(data);
        setFormData(prev => ({
          ...prev,
          monthlyRent: data.rentAmount.toString(),
          securityDeposit: data.depositAmount ? data.depositAmount.toString() : "",
        }));
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching unit:", error);
        setLoading(false);
      });
  }, [params.id, params.unitId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate National ID
    if (!formData.tenantIdNumber.trim()) {
      setNotification({
        show: true,
        type: "error",
        message: "National ID is required",
      });
      return;
    }

    const startDate = new Date(formData.leaseStartDate);
    const endDate = new Date(formData.leaseEndDate);

    if (startDate >= endDate) {
      setNotification({
        show: true,
        type: "error",
        message: "Lease end date must be after start date",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/properties/${params.id}/units/${params.unitId}/assign-tenant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant: {
              firstName: formData.tenantFirstName,
              lastName: formData.tenantLastName,
              email: formData.tenantEmail,
              phoneNumber: formData.tenantPhone,
              idNumber: formData.tenantIdNumber, // ADDED: Send National ID
            },
            lease: {
              startDate: formData.leaseStartDate,
              endDate: formData.leaseEndDate,
              monthlyRent: parseFloat(formData.monthlyRent),
              securityDeposit: formData.securityDeposit ? parseFloat(formData.securityDeposit) : 0,
            },
          }),
        }
      );

      if (response.ok) {
        setNotification({
          show: true,
          type: "success",
          message: "Tenant assigned successfully!",
        });
        setTimeout(() => {
          router.push(`/dashboard/properties/${params.id}/units/${params.unitId}`);
        }, 1500);
      } else {
        const error = await response.json();
        setNotification({
          show: true,
          type: "error",
          message: error.error || "Failed to assign tenant",
        });
      }
    } catch (error) {
      console.error("Error assigning tenant:", error);
      setNotification({
        show: true,
        type: "error",
        message: "An unexpected error occurred",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-white">Loading...</div>;
  if (!unit) return <div className="text-white">Unit not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/properties/${params.id}/units/${params.unitId}`}>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Unit
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
            Assign Tenant to Unit {unit.unitNumber}
          </h1>
          <p className="text-gray-400 mt-1">{unit.properties.name}</p>
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Unit Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Unit Number</p>
            <p className="text-white font-semibold">{unit.unitNumber}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Type</p>
            <p className="text-white font-semibold">{unit.type.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Monthly Rent</p>
            <p className="text-green-400 font-bold">KSH {unit.rentAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Deposit</p>
            <p className="text-blue-400 font-bold">
              {unit.depositAmount ? `KSH ${unit.depositAmount.toLocaleString()}` : "Not set"}
            </p>
          </div>
        </div>
      </div>

      {notification.show && (
        <div className={`p-4 rounded-lg border ${
          notification.type === "success"
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {notification.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-700/50 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-cyan-400">Tenant Information</h3>
              <p className="text-sm text-gray-400">Enter the tenant's personal details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
              <Input
                value={formData.tenantFirstName}
                onChange={(e) => setFormData({ ...formData, tenantFirstName: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
              <Input
                value={formData.tenantLastName}
                onChange={(e) => setFormData({ ...formData, tenantLastName: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                required
              />
            </div>
            
            {/* ADDED: National ID Field - REQUIRED */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <IdCard className="w-4 h-4 text-cyan-400" />
                National ID / Passport Number *
              </label>
              <Input
                value={formData.tenantIdNumber}
                onChange={(e) => setFormData({ ...formData, tenantIdNumber: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="e.g., 12345678"
                required
              />
              <p className="text-xs text-gray-500 mt-1">This is a required field for all tenants</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
              <Input
                type="email"
                value={formData.tenantEmail}
                onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
              <Input
                value={formData.tenantPhone}
                onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="e.g., +254712345678"
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/50 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-400">Lease Information</h3>
              <p className="text-sm text-gray-400">Define the lease terms and duration</p>
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
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">End Date *</label>
              <Input
                type="date"
                value={formData.leaseEndDate}
                onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Rent (KSH) *</label>
              <Input
                type="number"
                step="0.01"
                value={formData.monthlyRent}
                onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                required
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Security Deposit (KSH)</label>
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

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-400 font-semibold text-sm">Important</p>
            <p className="text-gray-300 text-sm mt-1">
              Once assigned, the unit status will automatically change to OCCUPIED (if lease starts today/past)
              or RESERVED (if lease starts in future). A user account will be created for the tenant with their National ID.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
          >
            {submitting ? "Assigning..." : "Assign Tenant"}
          </Button>
          <Link href={`/dashboard/properties/${params.id}/units/${params.unitId}`}>
            <Button type="button" variant="outline" className="border-gray-700 text-gray-400 hover:bg-gray-800">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
