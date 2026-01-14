"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowLeft, Loader2, AlertCircle, Edit2, Save, X, Eye, Check, XCircle, Clock, Image as ImageIcon } from "lucide-react";
import NotificationModal from "@/components/NotificationModal";

interface Property {
  id: string;
  name: string;
  paystackActive: boolean;
  paystackSubaccountCode: string | null;
  paystackAccountName: string | null;
  paystackAccountNumber: string | null;
  paystackBankCode: string | null;
  paystackAccountEmail: string | null;
  mpesaPhoneNumber: string | null;
  mpesaTillNumber: string | null;
  mpesaTillName: string | null;
  mpesaPaybillNumber: string | null;
  mpesaPaybillName: string | null;
  bankAccounts: any;
  paymentInstructions: string | null;
}

interface Bank {
  id: number;
  name: string;
  code: string;
  active: boolean;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch: string;
}

interface Payment {
  id: string;
  referenceNumber: string;
  amount: number;
  paymentMethod: string;
  status: string;
  verificationStatus: string;
  proofOfPaymentUrl: string | null;
  proofOfPaymentNotes: string | null;
  proofUploadedAt: string | null;
  verificationNotes: string | null;
  verifiedAt: string | null;
  paymentDate: string;
  tenants: {
    users: {
      firstName: string;
      lastName: string;
      email: string;
    };
    units: {
      unitNumber: string;
    };
  };
  verifiedBy: {
    firstName: string;
    lastName: string;
  } | null;
}

export default function PaymentSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [editingPaystack, setEditingPaystack] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
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

  // Paystack form fields
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // Manual payment methods
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [tillNumber, setTillNumber] = useState("");
  const [tillName, setTillName] = useState("");
  const [paybillNumber, setPaybillNumber] = useState("");
  const [paybillName, setPaybillName] = useState("");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [paymentInstructions, setPaymentInstructions] = useState("");

  useEffect(() => {
    fetchData();
  }, [propertyId]);

  const fetchData = async () => {
    try {
      // Fetch property details
      const propertyResponse = await fetch(`/api/admin/properties/${propertyId}`);
      if (propertyResponse.ok) {
        const propertyData = await propertyResponse.json();
        const prop = propertyData.property;
        setProperty(prop);
        setBusinessName(prop.name);
        setEmail(prop.paystackAccountEmail || "");
        setBankCode(prop.paystackBankCode || "");
        setAccountNumber(prop.paystackAccountNumber || "");

        // Load manual payment methods
        setMpesaPhone(prop.mpesaPhoneNumber || "");
        setTillNumber(prop.mpesaTillNumber || "");
        setTillName(prop.mpesaTillName || "");
        setPaybillNumber(prop.mpesaPaybillNumber || "");
        setPaybillName(prop.mpesaPaybillName || "");
        setPaymentInstructions(prop.paymentInstructions || "");
        
        if (prop.bankAccounts) {
          try {
            const accounts = JSON.parse(prop.bankAccounts);
            setBankAccounts(Array.isArray(accounts) ? accounts : []);
          } catch (e) {
            setBankAccounts([]);
          }
        }
      }

      // Fetch banks
      const banksResponse = await fetch("/api/admin/paystack/banks");
      if (banksResponse.ok) {
        const banksData = await banksResponse.json();
        setBanks(banksData.banks.filter((b: Bank) => b.active));
      }

      // Fetch payments for this property
      const paymentsResponse = await fetch(`/api/admin/properties/${propertyId}/payments`);
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setPayments(paymentsData.payments || []);
      }
    } catch (err: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: err.message || "Failed to load payment settings",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/admin/paystack/create-subaccount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          businessName,
          bankCode,
          accountNumber,
          email,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to setup Paystack");
      }

      const data = await response.json();
      
      setNotification({
        isOpen: true,
        type: "success",
        title: "Paystack Configured!",
        message: `Account verified: ${data.accountName}. Tenants can now pay via Paystack!`,
      });

      setEditingPaystack(false);
      
      setTimeout(() => {
        fetchData();
      }, 2000);
    } catch (err: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Paystack Setup Failed",
        message: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingManual(true);

    try {
      const response = await fetch(`/api/admin/properties/${propertyId}/payment-methods`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mpesaPhoneNumber: mpesaPhone || null,
          mpesaTillNumber: tillNumber || null,
          mpesaTillName: tillName || null,
          mpesaPaybillNumber: paybillNumber || null,
          mpesaPaybillName: paybillName || null,
          bankAccounts: JSON.stringify(bankAccounts),
          paymentInstructions: paymentInstructions || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update payment methods");
      }

      setNotification({
        isOpen: true,
        type: "success",
        title: "Payment Methods Updated!",
        message: "Manual payment methods saved successfully. Tenants can now see these options.",
      });
      
      setTimeout(() => {
        fetchData();
      }, 2000);
    } catch (err: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Update Failed",
        message: err.message,
      });
    } finally {
      setSavingManual(false);
    }
  };

  const handleVerifyPayment = async (paymentId: string, status: "APPROVED" | "DECLINED", notes?: string) => {
    setVerifyingPayment(paymentId);

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationStatus: status,
          verificationNotes: notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to verify payment");
      }

      setNotification({
        isOpen: true,
        type: "success",
        title: status === "APPROVED" ? "Payment Approved!" : "Payment Declined",
        message: status === "APPROVED" 
          ? "Payment has been verified and the bill has been marked as paid."
          : "Payment has been declined. The tenant will be notified.",
      });

      fetchData();
    } catch (err: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Verification Failed",
        message: err.message,
      });
    } finally {
      setVerifyingPayment(null);
    }
  };

  const addBankAccount = () => {
    setBankAccounts([
      ...bankAccounts,
      {
        id: `bank_${Date.now()}`,
        bankName: "",
        accountNumber: "",
        accountName: "",
        branch: "",
      },
    ]);
  };

  const removeBankAccount = (id: string) => {
    setBankAccounts(bankAccounts.filter((acc) => acc.id !== id));
  };

  const updateBankAccount = (id: string, field: string, value: string) => {
    setBankAccounts(
      bankAccounts.map((acc) =>
        acc.id === id ? { ...acc, [field]: value } : acc
      )
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-500/10 text-green-400 border-green-500/30";
      case "DECLINED":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-4 w-4" />;
      case "DECLINED":
        return <XCircle className="h-4 w-4" />;
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const filteredPayments = payments.filter((payment) => {
    if (filterStatus === "all") return true;
    return payment.verificationStatus === filterStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-800 rounded-lg transition"
        >
          <ArrowLeft className="h-6 w-6 text-gray-400" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Payment Settings</h1>
          <p className="text-gray-400 mt-1">{property?.name}</p>
        </div>
      </div>

      {/* Section 1: Paystack Payment (Automated) */}
      <Card className="bg-gray-900/50 border-purple-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-2xl">💳 Automated Payment (Paystack)</CardTitle>
              <CardDescription className="text-gray-300 mt-1">
                Tenants can pay via M-Pesa, Cards, or Bank Transfer - money goes directly to your account
              </CardDescription>
            </div>
            {property?.paystackActive && !editingPaystack && (
              <button
                onClick={() => setEditingPaystack(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/20 transition"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {property?.paystackActive && property.paystackSubaccountCode && !editingPaystack ? (
            /* Display Current Paystack Config */
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <p className="text-green-400 font-semibold">Paystack Payment Active ✅</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Account Name</p>
                    <p className="text-white font-medium">{property.paystackAccountName}</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Account Number</p>
                    <p className="text-white font-medium">{property.paystackAccountNumber}</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Email</p>
                    <p className="text-white font-medium">{property.paystackAccountEmail}</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Subaccount Code</p>
                    <p className="text-white font-medium text-xs">{property.paystackSubaccountCode}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-sm text-blue-400 font-medium mb-2">✅ Benefits:</p>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Tenants pay via M-Pesa, Card, or Bank Transfer</li>
                  <li>• Money deposited directly to your bank account</li>
                  <li>• Payments are automatically verified ✅</li>
                  <li>• No platform commission - 100% to you</li>
                  <li>• Paystack fees: ~1.5% + KSh 10 per transaction</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Paystack Setup/Edit Form */
            <form onSubmit={handlePaystackSubmit} className="space-y-6">
              {editingPaystack && (
                <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <p className="text-sm text-yellow-400">
                    ⚠️ Editing will update your Paystack configuration. Make sure all details are correct.
                  </p>
                </div>
              )}

              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-sm text-blue-400 font-medium mb-2">💡 What you'll get:</p>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>✅ Accept M-Pesa, Cards, and Bank Transfers</li>
                  <li>✅ Money deposited directly to your bank (T+1 to T+2)</li>
                  <li>✅ Automatic payment verification</li>
                  <li>✅ No platform commission - 100% goes to you</li>
                  <li>✅ Paystack fees: ~1.5% + KSh 10 per transaction</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., Mizpha Rentals"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  You'll receive payment notifications here
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bank
                </label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  required
                >
                  <option value="">Select your bank</option>
                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="1234567890"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Payments will be deposited to this account
                </p>
              </div>

              <div className="flex gap-3">
                {editingPaystack && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPaystack(false);
                      fetchData(); // Reset form
                    }}
                    className="flex-1 px-6 py-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition flex items-center justify-center gap-2 font-semibold"
                  >
                    <X className="h-5 w-5" />
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold text-lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>{editingPaystack ? "Updating..." : "Setting up..."}</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>{editingPaystack ? "Update Paystack" : "Setup Paystack Payment"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Manual Payment Methods */}
      <Card className="bg-gray-900/50 border-yellow-500/20">
        <CardHeader>
          <CardTitle className="text-white text-2xl">📋 Manual Payment Methods</CardTitle>
          <CardDescription className="text-gray-300">
            Provide M-Pesa Till/Paybill or Bank details for tenants who prefer manual payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualPaymentSubmit} className="space-y-6">
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-sm text-yellow-400 font-medium mb-1">💡 Why provide manual methods?</p>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Some tenants prefer traditional payment methods</li>
                <li>• No transaction fees (but requires manual verification)</li>
                <li>• Tenants upload proof of payment for your verification</li>
              </ul>
            </div>

            {/* M-Pesa Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                M-Pesa Phone Number (Optional)
              </label>
              <input
                type="text"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="e.g., 0712345678"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>

            {/* M-Pesa Till */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Till Number (Optional)
                </label>
                <input
                  type="text"
                  value={tillNumber}
                  onChange={(e) => setTillNumber(e.target.value)}
                  placeholder="e.g., 123456"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Till Name (Optional)
                </label>
                <input
                  type="text"
                  value={tillName}
                  onChange={(e) => setTillName(e.target.value)}
                  placeholder="e.g., Mizpha Rentals"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            {/* M-Pesa Paybill */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Paybill Number (Optional)
                </label>
                <input
                  type="text"
                  value={paybillNumber}
                  onChange={(e) => setPaybillNumber(e.target.value)}
                  placeholder="e.g., 123456"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Paybill Name (Optional)
                </label>
                <input
                  type="text"
                  value={paybillName}
                  onChange={(e) => setPaybillName(e.target.value)}
                  placeholder="e.g., Mizpha Rentals"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            {/* Bank Accounts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Bank Accounts (Optional)
                </label>
                <button
                  type="button"
                  onClick={addBankAccount}
                  className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-500/20 transition"
                >
                  + Add Bank Account
                </button>
              </div>
              <div className="space-y-3">
                {bankAccounts.map((account, index) => (
                  <div key={account.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-400">Bank Account #{index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeBankAccount(account.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={account.bankName}
                        onChange={(e) => updateBankAccount(account.id, "bankName", e.target.value)}
                        placeholder="Bank Name"
                        className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500"
                      />
                      <input
                        type="text"
                        value={account.accountNumber}
                        onChange={(e) => updateBankAccount(account.id, "accountNumber", e.target.value)}
                        placeholder="Account Number"
                        className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500"
                      />
                      <input
                        type="text"
                        value={account.accountName}
                        onChange={(e) => updateBankAccount(account.id, "accountName", e.target.value)}
                        placeholder="Account Name"
                        className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500"
                      />
                      <input
                        type="text"
                        value={account.branch}
                        onChange={(e) => updateBankAccount(account.id, "branch", e.target.value)}
                        placeholder="Branch"
                        className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Instructions (Optional)
              </label>
              <textarea
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="e.g., Please use your unit number as reference when making payment"
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingManual}
              className="w-full px-6 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold text-lg"
            >
              {savingManual ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Save Manual Payment Methods</span>
                </>
              )}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Section 3: Payment Verification Dashboard */}
      <Card className="bg-gray-900/50 border-cyan-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-2xl">📊 Payment Verification Dashboard</CardTitle>
              <CardDescription className="text-gray-300">
                Review and verify manual payments with proof of payment
              </CardDescription>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Payments</option>
              <option value="PENDING">Pending Verification</option>
              <option value="APPROVED">Approved</option>
              <option value="DECLINED">Declined</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">No payments found</p>
              <p className="text-gray-500 text-sm mt-2">
                {filterStatus === "all" 
                  ? "Payments will appear here when tenants upload proof of payment"
                  : `No ${filterStatus.toLowerCase()} payments`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-cyan-500/50 transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {payment.tenants.users.firstName} {payment.tenants.users.lastName}
                        </h3>
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/30">
                          Unit {payment.tenants.units.unitNumber}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getVerificationStatusColor(payment.verificationStatus)}`}>
                          {getVerificationStatusIcon(payment.verificationStatus)}
                          {payment.verificationStatus}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">{payment.tenants.users.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-gray-400 mt-1">{payment.paymentMethod}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-gray-900 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Reference Number</p>
                      <p className="text-white font-mono text-sm">{payment.referenceNumber}</p>
                    </div>
                    <div className="p-3 bg-gray-900 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Payment Date</p>
                      <p className="text-white text-sm">{formatDate(payment.paymentDate)}</p>
                    </div>
                  </div>

                  {payment.proofOfPaymentNotes && (
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 mb-4">
                      <p className="text-xs text-blue-400 font-medium mb-1">Tenant's Note:</p>
                      <p className="text-white text-sm">{payment.proofOfPaymentNotes}</p>
                    </div>
                  )}

                  {payment.proofOfPaymentUrl && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-400 mb-2">Proof of Payment:</p>
                      <div className="relative group cursor-pointer" onClick={() => setSelectedImage(payment.proofOfPaymentUrl)}>
                        <img
                          src={payment.proofOfPaymentUrl}
                          alt="Proof of payment"
                          className="w-full h-48 object-cover rounded-lg border border-gray-700"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
                          <Eye className="h-8 w-8 text-white" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Uploaded: {payment.proofUploadedAt ? formatDate(payment.proofUploadedAt) : "N/A"}
                      </p>
                    </div>
                  )}

                  {payment.verificationStatus === "DECLINED" && payment.verificationNotes && (
                    <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 mb-4">
                      <p className="text-xs text-red-400 font-medium mb-1">Decline Reason:</p>
                      <p className="text-white text-sm">{payment.verificationNotes}</p>
                    </div>
                  )}

                  {payment.verificationStatus === "APPROVED" && payment.verifiedBy && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 mb-4">
                      <p className="text-xs text-green-400 font-medium mb-1">Verified by:</p>
                      <p className="text-white text-sm">
                        {payment.verifiedBy.firstName} {payment.verifiedBy.lastName} on {payment.verifiedAt ? formatDate(payment.verifiedAt) : "N/A"}
                      </p>
                    </div>
                  )}

                  {payment.verificationStatus === "PENDING" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const notes = prompt("Add optional approval notes:");
                          handleVerifyPayment(payment.id, "APPROVED", notes || undefined);
                        }}
                        disabled={verifyingPayment === payment.id}
                        className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
                      >
                        {verifyingPayment === payment.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-5 w-5" />
                            Approve Payment
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt("Reason for declining (required):");
                          if (notes && notes.trim()) {
                            handleVerifyPayment(payment.id, "DECLINED", notes);
                          } else {
                            alert("Please provide a reason for declining");
                          }
                        }}
                        disabled={verifyingPayment === payment.id}
                        className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
                      >
                        <X className="h-5 w-5" />
                        Decline Payment
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition"
            >
              <X className="h-6 w-6 text-white" />
            </button>
            <img
              src={selectedImage}
              alt="Proof of payment"
              className="w-full h-auto rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Notification Modal */}
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