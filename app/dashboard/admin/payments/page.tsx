"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  Clock, 
  XCircle, 
  TrendingUp,
  Download,
  Search,
  Eye,
  Check,
  X,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import NotificationModal from "@/components/NotificationModal";

interface PaymentStats {
  totalRevenue: number;
  pendingPayments: {
    count: number;
    amount: number;
  };
  overduePayments: {
    count: number;
    amount: number;
  };
  collectionRate: number;
}

interface Payment {
  id: string;
  referenceNumber: string;
  amount: number;
  paymentMethod: string;
  paymentType: string;
  status: string;
  verificationStatus: string;
  paymentDate: string;
  proofOfPaymentUrl: string | null;
  proofOfPaymentNotes: string | null;
  verificationNotes: string | null;
  verifiedAt: string | null;
  tenant: {
    firstName: string;
    lastName: string;
    email: string;
  };
  unit: {
    unitNumber: string;
  };
  property: {
    name: string;
  };
  verifiedBy: {
    firstName: string;
    lastName: string;
  } | null;
}

export default function PaymentsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");

  // Notification
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
    fetchData();
  }, [statusFilter, verificationFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/payments/stats'),
        fetch(`/api/admin/payments/list?status=${statusFilter}&verificationStatus=${verificationFilter}`)
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.payments);
      }
    } catch (error) {
      console.error("Error fetching payment data:", error);
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Failed to load payment data",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (
    paymentId: string,
    verificationStatus: "APPROVED" | "DECLINED",
    notes?: string
  ) => {
    setVerifyingPayment(paymentId);

    try {
      const response = await fetch("/api/admin/payments/verify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          verificationStatus,
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
        title: verificationStatus === "APPROVED" ? "Payment Approved!" : "Payment Declined",
        message: verificationStatus === "APPROVED"
          ? "Payment has been verified and the bill has been marked as paid."
          : "Payment has been declined. The tenant will be notified.",
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Verification Failed",
        message: error.message,
      });
    } finally {
      setVerifyingPayment(null);
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500/10 text-green-400 border-green-500/30";
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "FAILED":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-500/10 text-green-400 border-green-500/30";
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "DECLINED":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  const filteredPayments = payments.filter((payment) =>
    payment.tenant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.tenant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.unit.unitNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">💰 Payments</h1>
          <p className="text-gray-400 mt-1">Complete payment tracking and verification</p>
        </div>
        <button
          onClick={() => {/* TODO: Export logic */}}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400">
              {formatCurrency(stats?.totalRevenue || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">This Month</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-400">
              {stats?.pendingPayments.count || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(stats?.pendingPayments.amount || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-400">
              {stats?.overduePayments.count || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(stats?.overduePayments.amount || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Collection Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">
              {stats?.collectionRate || 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Last 30 Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tenant, reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>

            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Verification</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="DECLINED">Declined</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Payment Transactions</CardTitle>
          <CardDescription>
            {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">No payments found</p>
              <p className="text-gray-500 text-sm mt-2">
                Payments will appear here when tenants make transactions
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500/50 transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {payment.tenant.firstName} {payment.tenant.lastName}
                        </h3>
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/30">
                          Unit {payment.unit.unitNumber}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded border ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded border ${getVerificationColor(payment.verificationStatus)}`}>
                          {payment.verificationStatus}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">{payment.property.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-gray-400 mt-1">{payment.paymentMethod}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-gray-900 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Reference</p>
                      <p className="text-white font-mono text-sm">{payment.referenceNumber}</p>
                    </div>
                    <div className="p-3 bg-gray-900 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Payment Date</p>
                      <p className="text-white text-sm">{formatDate(payment.paymentDate)}</p>
                    </div>
                    <div className="p-3 bg-gray-900 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Type</p>
                      <p className="text-white text-sm">{payment.paymentType}</p>
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
                      <div 
                        className="relative group cursor-pointer w-full h-48"
                        onClick={() => setSelectedImage(payment.proofOfPaymentUrl)}
                      >
                        <img
                          src={payment.proofOfPaymentUrl}
                          alt="Proof of payment"
                          className="w-full h-full object-cover rounded-lg border border-gray-700"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
                          <Eye className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  {payment.verificationStatus === "DECLINED" && payment.verificationNotes && (
                    <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 mb-4">
                      <p className="text-xs text-red-400 font-medium mb-1">Decline Reason:</p>
                      <p className="text-white text-sm">{payment.verificationNotes}</p>
                    </div>
                  )}

                  {payment.verifiedBy && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 mb-4">
                      <p className="text-xs text-green-400 font-medium mb-1">Verified by:</p>
                      <p className="text-white text-sm">
                        {payment.verifiedBy.firstName} {payment.verifiedBy.lastName}
                        {payment.verifiedAt && ` on ${formatDate(payment.verifiedAt)}`}
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
                        className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
