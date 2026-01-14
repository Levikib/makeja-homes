"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CreditCard, CheckCircle, Clock, XCircle, Download, Smartphone, Building2, Upload, Eye, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import NotificationModal from "@/components/NotificationModal";

interface Bill {
  id: string;
  month: string;
  rentAmount: number;
  waterAmount: number;
  garbageAmount: number;
  totalAmount: number;
  status: string;
  dueDate: string;
  paidDate: string | null;
  isPaid: boolean;
}

interface Payment {
  id: string;
  referenceNumber: string;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  status: string;
  paymentDate: string;
  notes: string | null;
  receiptUrl: string | null;
  verificationStatus: string;
  proofOfPaymentUrl: string | null;
  proofOfPaymentNotes: string | null;
  verificationNotes: string | null;
  verifiedAt: string | null;
}

interface PaymentMethods {
  property: {
    id: string;
    name: string;
  };
  paystack: {
    available: boolean;
    subaccountCode: string | null;
    email: string | null;
  };
  mpesa: {
    phone: {
      available: boolean;
      number: string | null;
    };
    till: {
      available: boolean;
      number: string | null;
      name: string | null;
    };
    paybill: {
      available: boolean;
      number: string | null;
      name: string | null;
    };
  };
  bank: {
    available: boolean;
    accounts: Array<{
      id: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
      branch: string;
    }>;
  };
  instructions: string | null;
  unitNumber: string;
}

export default function PaymentsPage() {
  const [currentBill, setCurrentBill] = useState<Bill | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods | null>(null);
  const [showTillModal, setShowTillModal] = useState(false);
  const [showPaybillModal, setShowPaybillModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPaymentForUpload, setSelectedPaymentForUpload] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData(true); // Silent refresh
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Fetch current bill
      const billResponse = await fetch("/api/tenant/payments/current-bill");
      if (billResponse.ok) {
        const billData = await billResponse.json();
        setCurrentBill(billData.bill);
      }

      // Fetch payment history
      const historyResponse = await fetch("/api/tenant/payments/history");
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setPayments(historyData.payments);
        setTotalPaid(historyData.totalPaid);
      }

      // Fetch property payment methods
      const methodsResponse = await fetch("/api/tenant/payments/payment-methods");
      if (methodsResponse.ok) {
        const methodsData = await methodsResponse.json();
        console.log("💳 Payment methods received:", methodsData);
        setPaymentMethods(methodsData);
      }
    } catch (err: any) {
      if (!silent) {
        setNotification({
          isOpen: true,
          type: "error",
          title: "Error",
          message: err.message || "Failed to load payment data",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handlePaystackPayment = async () => {
    if (!currentBill) return;

    try {
      const response = await fetch("/api/tenant/payments/paystack-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: currentBill.id,
          amount: currentBill.totalAmount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Payment initialization failed");
      }

      const data = await response.json();
      console.log("✅ Paystack initialized:", data);

      // Redirect to Paystack payment page
      window.location.href = data.paymentUrl;
    } catch (error: any) {
      console.error("❌ Payment error:", error);
      setNotification({
        isOpen: true,
        type: "error",
        title: "Payment Failed",
        message: error.message,
      });
    }
  };

  const handleUploadProof = (paymentId: string) => {
    setSelectedPaymentForUpload(paymentId);
    setShowUploadModal(true);
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
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "VERIFIED":
      case "PAID":
        return "text-green-400 bg-green-500/10 border-green-500/30";
      case "PENDING":
      case "AWAITING_VERIFICATION":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "FAILED":
      case "CANCELLED":
      case "REJECTED":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "text-green-400 bg-green-500/10 border-green-500/30";
      case "PENDING":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "DECLINED":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "VERIFIED":
      case "PAID":
        return <CheckCircle className="h-4 w-4" />;
      case "PENDING":
      case "AWAITING_VERIFICATION":
        return <Clock className="h-4 w-4" />;
      case "FAILED":
      case "CANCELLED":
      case "REJECTED":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-200">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">Payments</h1>
          <p className="text-gray-300 mt-2 text-lg">Make payments and view history</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white rounded-lg transition"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Current Bill</CardTitle>
            <DollarSign className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {currentBill ? formatCurrency(currentBill.totalAmount) : "KSh 0"}
            </div>
            <p className="text-xs text-gray-300 mt-1">
              {currentBill?.isPaid ? "Paid" : "Due " + (currentBill ? formatDate(currentBill.dueDate) : "")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Total Paid</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-gray-300 mt-1">Lifetime payments</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-blue-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Transactions</CardTitle>
            <CreditCard className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{payments.length}</div>
            <p className="text-xs text-gray-300 mt-1">Total payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Month Bill Card */}
      {currentBill && !currentBill.isPaid && (
        <Card className="bg-gray-900/50 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-3xl text-white">💳 Pay Current Month Bill</CardTitle>
            <CardDescription className="text-gray-300 text-base">
              {new Date(currentBill.month).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bill Breakdown */}
            <div className="grid grid-cols-3 gap-4 p-5 bg-gray-800 rounded-xl">
              <div>
                <p className="text-sm text-gray-300">Rent</p>
                <p className="text-xl font-semibold text-white">
                  {formatCurrency(currentBill.rentAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-300">Water</p>
                <p className="text-xl font-semibold text-white">
                  {formatCurrency(currentBill.waterAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-300">Garbage</p>
                <p className="text-xl font-semibold text-white">
                  {formatCurrency(currentBill.garbageAmount)}
                </p>
              </div>
            </div>

            {/* Total */}
            <div className="p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border-2 border-purple-500/30">
              <div className="flex justify-between items-center">
                <span className="text-xl font-medium text-white">Total Amount Due</span>
                <span className="text-5xl font-bold text-white">
                  {formatCurrency(currentBill.totalAmount)}
                </span>
              </div>
              <p className="text-sm text-gray-300 mt-2">
                Due Date: {formatDate(currentBill.dueDate)}
              </p>
            </div>

            {/* Property Info */}
            {paymentMethods && (
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-sm text-gray-300">Payment will be sent to:</p>
                <p className="text-lg text-white font-semibold">{paymentMethods.property.name}</p>
              </div>
            )}

            {/* Payment Options */}
            {paymentMethods && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">💳 Choose Payment Method:</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Paystack Payment (PRIMARY - Automated) */}
                  {paymentMethods.paystack.available ? (
                    <div className="relative group md:col-span-2">
                      <button
                        onClick={handlePaystackPayment}
                        className="w-full p-8 bg-gradient-to-br from-yellow-500 to-orange-600 text-white rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
                      >
                        <CreditCard className="h-12 w-12 mx-auto mb-4" />
                        <p className="font-bold text-xl mb-2">Pay with Paystack</p>
                        <p className="text-sm opacity-90 mb-4">M-Pesa • Card • Bank Transfer</p>
                        <div className="mt-4 px-6 py-3 bg-white/20 rounded-lg font-bold text-base">
                          💳 PAY NOW - INSTANT
                        </div>
                        <p className="text-xs mt-3 opacity-75">Safe & Secure • Auto-Verified ✅</p>
                      </button>
                    </div>
                  ) : (
                    <div className="md:col-span-2 p-8 bg-gray-800/50 rounded-xl border-2 border-yellow-500/30 text-center">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                      <p className="text-yellow-400 font-bold text-lg mb-2">Online Payment Not Available</p>
                      <p className="text-gray-400 text-sm">Please use manual payment methods below</p>
                    </div>
                  )}

                  {/* Manual Payment Methods */}
                  <div className="col-span-full">
                    <h4 className="text-base font-semibold text-gray-300 mb-3">📋 Manual Payment Methods:</h4>
                    <p className="text-sm text-yellow-400 mb-3">⚠️ After paying manually, click "I've Paid" button to upload proof</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Till Number */}
                      {paymentMethods.mpesa.till.available && (
                        <button
                          onClick={() => setShowTillModal(true)}
                          className="p-4 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 border border-blue-500/30"
                        >
                          <Smartphone className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                          <p className="font-semibold text-sm mb-1">M-Pesa Till</p>
                          <p className="text-xs opacity-75 mb-2">{paymentMethods.mpesa.till.number}</p>
                          <div className="text-xs px-3 py-1 bg-white/10 rounded">VIEW DETAILS</div>
                        </button>
                      )}

                      {/* Paybill */}
                      {paymentMethods.mpesa.paybill.available && (
                        <button
                          onClick={() => setShowPaybillModal(true)}
                          className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-600/20 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 border border-purple-500/30"
                        >
                          <Building2 className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                          <p className="font-semibold text-sm mb-1">M-Pesa Paybill</p>
                          <p className="text-xs opacity-75 mb-2">{paymentMethods.mpesa.paybill.number}</p>
                          <div className="text-xs px-3 py-1 bg-white/10 rounded">VIEW DETAILS</div>
                        </button>
                      )}

                      {/* Bank Transfer */}
                      {paymentMethods.bank.available && (
                        <button
                          onClick={() => setShowBankModal(true)}
                          className="p-4 bg-gradient-to-br from-indigo-500/20 to-blue-600/20 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 border border-indigo-500/30"
                        >
                          <DollarSign className="h-8 w-8 mx-auto mb-2 text-indigo-400" />
                          <p className="font-semibold text-sm mb-1">Bank Transfer</p>
                          <p className="text-xs opacity-75 mb-2">{paymentMethods.bank.accounts.length} account(s)</p>
                          <div className="text-xs px-3 py-1 bg-white/10 rounded">VIEW ACCOUNTS</div>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {paymentMethods.instructions && (
                  <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <p className="text-sm text-yellow-400 font-medium mb-1">📌 Important Instructions:</p>
                    <p className="text-sm text-gray-300">{paymentMethods.instructions}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Paid Message */}
      {currentBill?.isPaid && (
        <Card className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4 text-green-400">
              <CheckCircle className="h-16 w-16" />
              <div>
                <p className="text-3xl font-bold">Current month is paid! ✅</p>
                <p className="text-sm text-gray-300 mt-2">
                  Paid on {currentBill.paidDate ? formatDate(currentBill.paidDate) : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card className="bg-gray-900/50 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Payment History</CardTitle>
          <CardDescription className="text-gray-300">All your past payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500/50 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-white font-semibold text-lg">{payment.referenceNumber}</p>
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status}
                      </span>
                      {payment.verificationStatus && (
                        <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getVerificationStatusColor(payment.verificationStatus)}`}>
                          {payment.verificationStatus === "APPROVED" ? <CheckCircle className="h-3 w-3" /> : 
                           payment.verificationStatus === "DECLINED" ? <XCircle className="h-3 w-3" /> :
                           <Clock className="h-3 w-3" />}
                          {payment.verificationStatus}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{formatDate(payment.paymentDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-gray-400 mt-1">{payment.paymentMethod}</p>
                  </div>
                </div>

                {payment.notes && (
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 mb-3">
                    <p className="text-xs text-blue-400 font-medium">Note:</p>
                    <p className="text-white text-sm">{payment.notes}</p>
                  </div>
                )}

                {/* Proof of Payment Section */}
                {payment.proofOfPaymentUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-400">Proof of Payment:</p>
                      <button
                        onClick={() => setSelectedImage(payment.proofOfPaymentUrl)}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/20 transition text-sm"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </div>
                    <img
                      src={payment.proofOfPaymentUrl}
                      alt="Proof of payment"
                      className="w-full h-32 object-cover rounded-lg border border-gray-700 cursor-pointer"
                      onClick={() => setSelectedImage(payment.proofOfPaymentUrl)}
                    />
                    {payment.proofOfPaymentNotes && (
                      <div className="p-3 bg-gray-900 rounded-lg">
                        <p className="text-xs text-gray-400">Your Note:</p>
                        <p className="text-white text-sm">{payment.proofOfPaymentNotes}</p>
                      </div>
                    )}
                  </div>
                ) : payment.status === "PENDING" && payment.paymentMethod !== "PAYSTACK" && payment.verificationStatus !== "DECLINED" && (
                  <button
                    onClick={() => handleUploadProof(payment.id)}
                    className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg transition flex items-center justify-center gap-2 font-semibold"
                  >
                    <Upload className="h-5 w-5" />
                    Upload Proof of Payment
                  </button>
                )}

                {/* Verification Status Messages */}
                {payment.verificationStatus === "PENDING" && payment.proofOfPaymentUrl && (
                  <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Clock className="h-4 w-4" />
                      <p className="text-sm font-medium">Awaiting landlord verification...</p>
                    </div>
                  </div>
                )}

                {payment.verificationStatus === "APPROVED" && (
                  <div className="mt-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <p className="text-sm font-medium">
                        {payment.paymentMethod === "PAYSTACK" 
                          ? "Payment verified by Paystack! ✅" 
                          : "Payment verified and approved by landlord! ✅"}
                      </p>
                    </div>
                    {payment.verifiedAt && (
                      <p className="text-xs text-gray-400 mt-1">Verified on {formatDate(payment.verifiedAt)}</p>
                    )}
                  </div>
                )}

                {payment.verificationStatus === "DECLINED" && (
                  <div className="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                      <XCircle className="h-4 w-4" />
                      <p className="text-sm font-medium">Payment declined by landlord</p>
                    </div>
                    {payment.verificationNotes && (
                      <div className="p-2 bg-gray-900 rounded mb-3">
                        <p className="text-xs text-gray-400">Reason:</p>
                        <p className="text-white text-sm">{payment.verificationNotes}</p>
                      </div>
                    )}
                    <button
                      onClick={() => handleUploadProof(payment.id)}
                      className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition text-sm font-medium"
                    >
                      Upload New Proof
                    </button>
                  </div>
                )}
              </div>
            ))}
            {payments.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                No payment history yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Payment Modals */}
      {showTillModal && paymentMethods && currentBill && (
        <TillModal
          paymentMethods={paymentMethods}
          bill={currentBill}
          onClose={() => setShowTillModal(false)}
          onPaymentCreated={(paymentId) => {
            setShowTillModal(false);
            setSelectedPaymentForUpload(paymentId);
            setShowUploadModal(true);
            fetchData();
          }}
          setNotification={setNotification}
        />
      )}

      {showPaybillModal && paymentMethods && currentBill && (
        <PaybillModal
          paymentMethods={paymentMethods}
          bill={currentBill}
          onClose={() => setShowPaybillModal(false)}
          onPaymentCreated={(paymentId) => {
            setShowPaybillModal(false);
            setSelectedPaymentForUpload(paymentId);
            setShowUploadModal(true);
            fetchData();
          }}
          setNotification={setNotification}
        />
      )}

      {showBankModal && paymentMethods && currentBill && (
        <BankDetailsModal
          paymentMethods={paymentMethods}
          bill={currentBill}
          onClose={() => setShowBankModal(false)}
          onPaymentCreated={(paymentId) => {
            setShowBankModal(false);
            setSelectedPaymentForUpload(paymentId);
            setShowUploadModal(true);
            fetchData();
          }}
          setNotification={setNotification}
        />
      )}

      {/* Upload Proof Modal */}
      {showUploadModal && selectedPaymentForUpload && (
        <UploadProofModal
          paymentId={selectedPaymentForUpload}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedPaymentForUpload(null);
            fetchData();
          }}
          setNotification={setNotification}
        />
      )}

      {/* Image Preview Modal */}
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
              <XCircle className="h-6 w-6 text-white" />
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

// Upload Proof Modal Component
function UploadProofModal({
  paymentId,
  onClose,
  setNotification,
}: {
  paymentId: string;
  onClose: () => void;
  setNotification: (notification: any) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        setError("Only JPG, PNG, and PDF files are allowed");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }

      setSelectedFile(file);
      setError("");

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("paymentId", paymentId);
      formData.append("notes", notes);

      const response = await fetch("/api/tenant/payments/upload-proof", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      setNotification({
        isOpen: true,
        type: "success",
        title: "Proof Uploaded Successfully!",
        message: "Your payment proof has been submitted. The landlord will verify it within 24 hours.",
      });

      onClose();
    } catch (err: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Upload Failed",
        message: err.message,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-gray-900 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-white text-xl">📤 Upload Proof of Payment</CardTitle>
          <CardDescription className="text-gray-300">
            Upload a screenshot or photo of your payment receipt
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Upload Receipt (JPG, PNG, or PDF)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-500 file:text-white file:cursor-pointer hover:file:bg-purple-600"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">Maximum file size: 5MB</p>
            </div>

            {previewUrl && (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg border border-gray-700"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Paid via M-Pesa Till on 13/01/2026"
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-medium"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Upload Proof
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-xs text-blue-400">
                ℹ️ Your landlord will verify the payment within 24 hours. You'll be notified once it's approved.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Till Modal Component
function TillModal({
  paymentMethods,
  bill,
  onClose,
  onPaymentCreated,
  setNotification,
}: {
  paymentMethods: PaymentMethods;
  bill: Bill;
  onClose: () => void;
  onPaymentCreated: (paymentId: string) => void;
  setNotification: (notification: any) => void;
}) {
  const [creating, setCreating] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleCreatePayment = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/tenant/payments/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: bill.totalAmount,
          paymentMethod: "MPESA_TILL",
          billId: bill.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create payment record");
      }

      const data = await response.json();
      
      setNotification({
        isOpen: true,
        type: "success",
        title: "Payment Record Created!",
        message: "Now upload your M-Pesa receipt as proof of payment.",
      });

      onPaymentCreated(data.payment.id);
    } catch (err: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: err.message,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-gray-900 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white text-xl">💳 Pay via M-Pesa Till</CardTitle>
          <CardDescription className="text-gray-300">{paymentMethods.property.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pb-6">
          <div className="p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border-2 border-purple-500/30">
            <p className="text-sm text-gray-300 mb-2">Amount to Pay</p>
            <p className="text-4xl font-bold text-white">
              {formatCurrency(bill.totalAmount)}
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Till Number</p>
              <p className="text-white font-medium text-2xl">{paymentMethods.mpesa.till.number}</p>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Business Name</p>
              <p className="text-white font-medium text-lg">{paymentMethods.mpesa.till.name || "N/A"}</p>
            </div>

            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-xs text-yellow-400 font-medium mb-1">Reference</p>
              <p className="text-white font-medium text-lg">Unit {paymentMethods.unitNumber}</p>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="font-medium mb-2 text-blue-400">Instructions:</p>
            <div className="space-y-1 text-sm text-gray-300">
              <p>1. Go to M-Pesa on your phone</p>
              <p>2. Select "Lipa na M-Pesa"</p>
              <p>3. Select "Buy Goods and Services"</p>
              <p>4. Enter Till Number: <strong>{paymentMethods.mpesa.till.number}</strong></p>
              <p>5. Enter amount: <strong>{formatCurrency(bill.totalAmount)}</strong></p>
              <p>6. Confirm payment</p>
              <p>7. Click "I've Paid" below to upload M-Pesa receipt</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-medium"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePayment}
              disabled={creating}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
            >
              {creating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  I've Paid - Upload Proof
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Paybill Modal Component
function PaybillModal({
  paymentMethods,
  bill,
  onClose,
  onPaymentCreated,
  setNotification,
}: {
  paymentMethods: PaymentMethods;
  bill: Bill;
  onClose: () => void;
  onPaymentCreated: (paymentId: string) => void;
  setNotification: (notification: any) => void;
}) {
  const [creating, setCreating] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleCreatePayment = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/tenant/payments/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: bill.totalAmount,
          paymentMethod: "MPESA_PAYBILL",
          billId: bill.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create payment record");
      }

      const data = await response.json();
      
      setNotification({
        isOpen: true,
        type: "success",
        title: "Payment Record Created!",
        message: "Now upload your M-Pesa receipt as proof of payment.",
      });

      onPaymentCreated(data.payment.id);
    } catch (err: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: err.message,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-gray-900 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white text-xl">💳 Pay via M-Pesa Paybill</CardTitle>
          <CardDescription className="text-gray-300">{paymentMethods.property.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pb-6">
          <div className="p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border-2 border-purple-500/30">
            <p className="text-sm text-gray-300 mb-2">Amount to Pay</p>
            <p className="text-4xl font-bold text-white">
              {formatCurrency(bill.totalAmount)}
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Paybill Number</p>
              <p className="text-white font-medium text-2xl">{paymentMethods.mpesa.paybill.number}</p>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Business Name</p>
              <p className="text-white font-medium text-lg">{paymentMethods.mpesa.paybill.name}</p>
            </div>

            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-xs text-yellow-400 font-medium mb-1">Account Number</p>
              <p className="text-white font-medium text-lg">Unit {paymentMethods.unitNumber}</p>
              <p className="text-xs text-gray-400 mt-1">⚠️ Use your unit number as account number</p>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="font-medium mb-2 text-blue-400">Instructions:</p>
            <div className="space-y-1 text-sm text-gray-300">
              <p>1. Go to M-Pesa on your phone</p>
              <p>2. Select "Lipa na M-Pesa"</p>
              <p>3. Select "Pay Bill"</p>
              <p>4. Enter Paybill: <strong>{paymentMethods.mpesa.paybill.number}</strong></p>
              <p>5. Enter Account: <strong>Unit {paymentMethods.unitNumber}</strong></p>
              <p>6. Enter amount: <strong>{formatCurrency(bill.totalAmount)}</strong></p>
              <p>7. Confirm payment</p>
              <p>8. Click "I've Paid" below to upload M-Pesa receipt</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-medium"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePayment}
              disabled={creating}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
            >
              {creating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  I've Paid - Upload Proof
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Bank Details Modal Component
function BankDetailsModal({
  paymentMethods,
  bill,
  onClose,
  onPaymentCreated,
  setNotification,
}: {
  paymentMethods: PaymentMethods;
  bill: Bill;
  onClose: () => void;
  onPaymentCreated: (paymentId: string) => void;
  setNotification: (notification: any) => void;
}) {
  const [creating, setCreating] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleCreatePayment = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/tenant/payments/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: bill.totalAmount,
          paymentMethod: "BANK_TRANSFER",
          billId: bill.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create payment record");
      }

      const data = await response.json();
      
      setNotification({
        isOpen: true,
        type: "success",
        title: "Payment Record Created!",
        message: "Now upload your bank transfer receipt as proof of payment.",
      });

      onPaymentCreated(data.payment.id);
    } catch (err: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: err.message,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-indigo-500/30">
        <CardHeader>
          <CardTitle className="text-white text-xl">🏦 Bank Transfer Details</CardTitle>
          <CardDescription className="text-gray-300">{paymentMethods.property.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pb-6">
          <div className="p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border-2 border-purple-500/30">
            <p className="text-sm text-gray-300 mb-2">Amount to Pay</p>
            <p className="text-4xl font-bold text-white">
              {formatCurrency(bill.totalAmount)}
            </p>
          </div>

          <p className="text-sm font-medium text-gray-300">
            Choose any of the following bank accounts:
          </p>

          <div className="space-y-4">
            {paymentMethods.bank.accounts.map((account, index) => (
              <div key={account.id} className="p-5 bg-gray-800 rounded-xl border border-gray-700 hover:border-purple-500/50 transition">
                <p className="text-xs text-gray-400 mb-3 font-medium">Bank Account #{index + 1}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Bank Name</p>
                    <p className="text-white font-medium text-lg">{account.bankName}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Account Number</p>
                    <p className="text-white font-medium text-lg">{account.accountNumber}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Account Name</p>
                    <p className="text-white font-medium">{account.accountName}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Branch</p>
                    <p className="text-white font-medium">{account.branch}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <p className="text-xs text-yellow-400 font-medium mb-1">Payment Reference</p>
            <p className="text-white font-medium text-lg">Unit {paymentMethods.unitNumber}</p>
            <p className="text-xs text-gray-300 mt-2">
              Please use your unit number as payment reference
            </p>
          </div>

          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="font-medium mb-2 text-blue-400">Important Notes:</p>
            <div className="space-y-1 text-sm text-gray-300">
              <p>• Make the bank transfer to any account above</p>
              <p>• Use Unit {paymentMethods.unitNumber} as reference</p>
              <p>• Keep your transaction receipt</p>
              <p>• Click "I've Paid" below to upload receipt</p>
              <p>• Payment will be verified within 24 hours</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-medium"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePayment}
              disabled={creating}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
            >
              {creating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  I've Paid - Upload Proof
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}