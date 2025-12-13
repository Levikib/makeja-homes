"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Home, DollarSign, Calendar } from "lucide-react";
import Link from "next/link";

export default function EditTenantPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    rentAmount: "",
    depositAmount: "",
    leaseStartDate: "",
    leaseEndDate: "",
  });
  const [tenantInfo, setTenantInfo] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/tenants/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setTenantInfo(data);
        setFormData({
          rentAmount: data.rentAmount?.toString() || "",
          depositAmount: data.depositAmount?.toString() || "",
          leaseStartDate: data.leaseStartDate ? new Date(data.leaseStartDate).toISOString().split('T')[0] : "",
          leaseEndDate: data.leaseEndDate ? new Date(data.leaseEndDate).toISOString().split('T')[0] : "",
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load tenant:", error);
        setLoading(false);
      });
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/tenants/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rentAmount: parseFloat(formData.rentAmount),
          depositAmount: formData.depositAmount ? parseFloat(formData.depositAmount) : null,
          leaseStartDate: new Date(formData.leaseStartDate),
          leaseEndDate: new Date(formData.leaseEndDate),
        }),
      });

      if (response.ok) {
        router.push(`/dashboard/admin/tenants/${params.id}`);
      }
    } catch (error) {
      console.error("Failed to update tenant:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-lg">Loading tenant...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/admin/tenants/${params.id}`}>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Edit Tenant
          </h1>
          {tenantInfo && (
            <p className="text-gray-400 mt-1">
              {tenantInfo.users?.firstName} {tenantInfo.users?.lastName} - {tenantInfo.units?.properties.name}, Unit {tenantInfo.units?.unitNumber}
            </p>
          )}
        </div>
      </div>

      {/* Current Tenant Info */}
      {tenantInfo && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            Current Tenant Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Name</p>
              <p className="text-white font-semibold">
                {tenantInfo.users?.firstName} {tenantInfo.users?.lastName}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Email</p>
              <p className="text-white">{tenantInfo.users?.email}</p>
            </div>
            <div>
              <p className="text-gray-400">Phone</p>
              <p className="text-white">{tenantInfo.users?.phoneNumber}</p>
            </div>
            <div>
              <p className="text-gray-400">Property</p>
              <p className="text-white">{tenantInfo.units?.properties.name}</p>
            </div>
            <div>
              <p className="text-gray-400">Unit</p>
              <p className="text-white">Unit {tenantInfo.units?.unitNumber}</p>
            </div>
            <div>
              <p className="text-gray-400">Unit Type</p>
              <p className="text-white">{tenantInfo.units?.type}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
        {/* Financial Information */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Financial Details
          </h3>
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
                className="bg-gray-900 border-gray-700 text-white"
                required
              />
              <p className="text-gray-500 text-xs mt-1">
                Current: KSH {tenantInfo?.rentAmount?.toLocaleString()}
              </p>
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
                className="bg-gray-900 border-gray-700 text-white"
              />
              <p className="text-gray-500 text-xs mt-1">
                Current: KSH {tenantInfo?.depositAmount?.toLocaleString() || "0"}
              </p>
            </div>
          </div>
        </div>

        {/* Lease Period */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Lease Period
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Date *
              </label>
              <Input
                type="date"
                value={formData.leaseStartDate}
                onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                required
              />
              <p className="text-gray-500 text-xs mt-1">
                Current: {new Date(tenantInfo?.leaseStartDate).toLocaleDateString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Date *
              </label>
              <Input
                type="date"
                value={formData.leaseEndDate}
                onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                required
              />
              <p className="text-gray-500 text-xs mt-1">
                Current: {new Date(tenantInfo?.leaseEndDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Link href={`/dashboard/admin/tenants/${params.id}`}>
            <Button type="button" variant="outline" className="border-gray-700 text-gray-400">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
