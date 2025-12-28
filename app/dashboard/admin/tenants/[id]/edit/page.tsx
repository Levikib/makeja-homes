"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Home, Info } from "lucide-react";
import Link from "next/link";
import NotificationModal from "@/components/NotificationModal";

export default function EditTenantPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<any>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    idNumber: "",
  });

  const [notification, setNotification] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  useEffect(() => {
    fetch(`/api/tenants/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setTenantInfo(data);
        setFormData({
          firstName: data.users?.firstName || "",
          lastName: data.users?.lastName || "",
          email: data.users?.email || "",
          phoneNumber: data.users?.phoneNumber || "",
          idNumber: data.users?.idNumber || "",
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
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setNotification({
          isOpen: true,
          type: "success",
          title: "Tenant Updated!",
          message: "Tenant details updated successfully.",
        });
        setTimeout(() => {
          router.push(`/dashboard/admin/tenants/${params.id}`);
        }, 1500);
      } else {
        throw new Error(result.error || "Failed to update tenant");
      }
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Update Failed",
        message: error.message || "Failed to update tenant. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading tenant...</p>
        </div>
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
            Edit Tenant
          </h1>
          {tenantInfo && (
            <p className="text-gray-400 mt-1">
              {tenantInfo.users?.firstName} {tenantInfo.users?.lastName} - {tenantInfo.units?.properties.name}, Unit {tenantInfo.units?.unitNumber}
            </p>
          )}
        </div>
      </div>

      {/* Property & Unit Info (Read-Only) */}
      {tenantInfo && (
        <div className="bg-gray-800/50 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-400" />
              Unit & Lease Information
            </h3>
            <div className="flex items-center gap-1 text-blue-400 text-sm">
              <Info className="w-4 h-4" />
              <span>Read-only - Edit from Units or Lease pages</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <p className="text-gray-400 text-xs mb-1">Property</p>
              <p className="text-white font-semibold">{tenantInfo.units?.properties.name}</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <p className="text-gray-400 text-xs mb-1">Unit</p>
              <p className="text-white font-semibold">Unit {tenantInfo.units?.unitNumber}</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <p className="text-gray-400 text-xs mb-1">Unit Type</p>
              <p className="text-white font-semibold">{tenantInfo.units?.type}</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <p className="text-gray-400 text-xs mb-1">Monthly Rent</p>
              <p className="text-white font-semibold">KSH {tenantInfo.rentAmount?.toLocaleString()}</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <p className="text-gray-400 text-xs mb-1">Deposit</p>
              <p className="text-white font-semibold">KSH {tenantInfo.depositAmount?.toLocaleString() || "0"}</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <p className="text-gray-400 text-xs mb-1">Lease Status</p>
              <p className="text-white font-semibold">{tenantInfo.leaseStatus || "Active"}</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <p className="text-gray-400 text-xs mb-1">Lease Start</p>
              <p className="text-white font-semibold">
                {tenantInfo.leaseStartDate ? new Date(tenantInfo.leaseStartDate).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <p className="text-gray-400 text-xs mb-1">Lease End</p>
              <p className="text-white font-semibold">
                {tenantInfo.leaseEndDate ? new Date(tenantInfo.leaseEndDate).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Editable Tenant Information */}
      <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-purple-400" />
          Tenant Personal Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="firstName" className="text-gray-300">
              First Name *
            </Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="lastName" className="text-gray-300">
              Last Name *
            </Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-300">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="phoneNumber" className="text-gray-300">
              Phone Number *
            </Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="idNumber" className="text-gray-300">
              National ID / Passport *
            </Label>
            <Input
              id="idNumber"
              value={formData.idNumber}
              onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
          </div>
        </div>

        <div className="flex gap-4 justify-end pt-4">
          <Link href={`/dashboard/admin/tenants/${params.id}`}>
            <Button type="button" variant="outline" className="border-gray-700 text-gray-400">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

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
