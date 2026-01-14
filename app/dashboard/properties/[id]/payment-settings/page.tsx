"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Plus, Trash2, CreditCard, Smartphone, Shield } from "lucide-react";
import Link from "next/link";

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch: string;
}

interface Property {
  id: string;
  name: string;
  mpesaPaybillNumber: string | null;
  mpesaTillNumber: string | null;
  mpesaAccountName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  bankBranch: string | null;
  paymentInstructions: string | null;
}

export default function PropertyPaymentSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const [property, setProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    // M-Pesa via Phone
    mpesaPhoneNumber: "",
    
    // M-Pesa Till
    mpesaTillNumber: "",
    mpesaTillName: "",
    
    // M-Pesa Paybill
    mpesaPaybillNumber: "",
    mpesaPaybillName: "",
    
    // Bank Accounts (supports multiple)
    bankAccounts: [] as BankAccount[],
    
    // Instructions
    paymentInstructions: "",
  });

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      // Check user role from token
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        router.push("/auth/login");
        return;
      }

      const userData = await response.json();
      setUserRole(userData.role);

      // Only ADMIN and MANAGER can access payment settings
      if (userData.role !== "ADMIN" && userData.role !== "MANAGER") {
        setUnauthorized(true);
        setLoading(false);
        setTimeout(() => {
          router.push("/dashboard");
        }, 3000);
        return;
      }

      // If authorized, fetch property
      fetchProperty();
    } catch (err: any) {
      console.error("Access check failed:", err);
      router.push("/auth/login");
    }
  };

  const fetchProperty = async () => {
    try {
      const response = await fetch(`/api/properties/${params.id}/payment-settings`);
      if (!response.ok) throw new Error("Failed to fetch property");

      const data = await response.json();
      setProperty(data);
      
      // Parse existing data
      setFormData({
        mpesaPhoneNumber: data.mpesaPhoneNumber || "",
        mpesaTillNumber: data.mpesaTillNumber || "",
        mpesaTillName: data.mpesaTillName || "",
        mpesaPaybillNumber: data.mpesaPaybillNumber || "",
        mpesaPaybillName: data.mpesaPaybillName || "",
        bankAccounts: data.bankAccounts || [],
        paymentInstructions: data.paymentInstructions || "",
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addBankAccount = () => {
    setFormData({
      ...formData,
      bankAccounts: [
        ...formData.bankAccounts,
        {
          id: `temp_${Date.now()}`,
          bankName: "",
          accountNumber: "",
          accountName: "",
          branch: "",
        },
      ],
    });
  };

  const updateBankAccount = (index: number, field: keyof BankAccount, value: string) => {
    const updated = [...formData.bankAccounts];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, bankAccounts: updated });
  };

  const removeBankAccount = (index: number) => {
    setFormData({
      ...formData,
      bankAccounts: formData.bankAccounts.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await fetch(`/api/properties/${params.id}/payment-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccess("Payment settings saved successfully! Tenants can now see these payment options.");
      setTimeout(() => {
        router.push(`/dashboard/properties/${params.id}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading property...</p>
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-red-500 text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              Only administrators can modify payment settings.
              <br />
              Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>Property not found</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/dashboard/properties/${params.id}`}
              className="text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-bold text-white">Payment Settings</h1>
          </div>
          <p className="text-gray-400 ml-8">{property.name}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <Shield className="h-4 w-4 text-purple-400" />
          <span className="text-sm text-purple-400">Admin Only</span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500">
          {success}
        </div>
      )}

      {/* Info Banner */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-400">
            💡 <strong>Note:</strong> Payment methods you configure here will be instantly available to all tenants of this property when they go to make payments.
          </p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* M-Pesa Phone Number */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-500" />
              <CardTitle>M-Pesa via Phone Number</CardTitle>
            </div>
            <CardDescription>
              Accept payments directly to a phone number
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Phone Number (254XXXXXXXXX)
              </label>
              <input
                type="text"
                value={formData.mpesaPhoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, mpesaPhoneNumber: e.target.value })
                }
                placeholder="e.g., 254712345678"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Tenants will send money directly to this number
              </p>
            </div>
          </CardContent>
        </Card>

        {/* M-Pesa Till Number */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              <CardTitle>M-Pesa Till Number</CardTitle>
            </div>
            <CardDescription>
              Configure your M-Pesa Till for payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Till Number
              </label>
              <input
                type="text"
                value={formData.mpesaTillNumber}
                onChange={(e) =>
                  setFormData({ ...formData, mpesaTillNumber: e.target.value })
                }
                placeholder="e.g., 987654"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Till Name
              </label>
              <input
                type="text"
                value={formData.mpesaTillName}
                onChange={(e) =>
                  setFormData({ ...formData, mpesaTillName: e.target.value })
                }
                placeholder="e.g., Mukuyu Shopping Mall"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* M-Pesa Paybill */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-500" />
              <CardTitle>M-Pesa Paybill Number</CardTitle>
            </div>
            <CardDescription>
              Configure your business Paybill number
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Paybill Number
              </label>
              <input
                type="text"
                value={formData.mpesaPaybillNumber}
                onChange={(e) =>
                  setFormData({ ...formData, mpesaPaybillNumber: e.target.value })
                }
                placeholder="e.g., 123456"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Paybill Name
              </label>
              <input
                type="text"
                value={formData.mpesaPaybillName}
                onChange={(e) =>
                  setFormData({ ...formData, mpesaPaybillName: e.target.value })
                }
                placeholder="e.g., Mukuyu Shopping Mall"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bank Accounts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bank Accounts</CardTitle>
                <CardDescription>
                  Add multiple bank accounts for payments
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={addBankAccount}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition"
              >
                <Plus className="h-4 w-4" />
                Add Bank Account
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.bankAccounts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No bank accounts added yet</p>
                <p className="text-sm mt-2">Click "Add Bank Account" to get started</p>
              </div>
            ) : (
              formData.bankAccounts.map((account, index) => (
                <div
                  key={account.id}
                  className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">Bank Account #{index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeBankAccount(index)}
                      className="text-red-400 hover:text-red-300 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={account.bankName}
                        onChange={(e) =>
                          updateBankAccount(index, "bankName", e.target.value)
                        }
                        placeholder="e.g., KCB Bank"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={account.accountNumber}
                        onChange={(e) =>
                          updateBankAccount(index, "accountNumber", e.target.value)
                        }
                        placeholder="e.g., 1234567890"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={account.accountName}
                        onChange={(e) =>
                          updateBankAccount(index, "accountName", e.target.value)
                        }
                        placeholder="e.g., Mukuyu Shopping Mall"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Branch
                      </label>
                      <input
                        type="text"
                        value={account.branch}
                        onChange={(e) =>
                          updateBankAccount(index, "branch", e.target.value)
                        }
                        placeholder="e.g., Nairobi Branch"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Instructions</CardTitle>
            <CardDescription>
              Additional instructions for tenants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              value={formData.paymentInstructions}
              onChange={(e) =>
                setFormData({ ...formData, paymentInstructions: e.target.value })
              }
              placeholder="e.g., Please use your unit number as payment reference"
              rows={4}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-4">
          <Link
            href={`/dashboard/properties/${params.id}`}
            className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="h-5 w-5" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}