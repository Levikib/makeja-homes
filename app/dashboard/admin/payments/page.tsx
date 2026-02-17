"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign, Clock, XCircle, TrendingUp, Download, Search, Eye,
  Check, X, Loader2, CheckCircle, AlertCircle,
  FileText, Zap, Bell, Send, Filter, Calendar
} from "lucide-react";
import NotificationModal from "@/components/NotificationModal";

interface PaymentStats {
  totalRevenue: number;
  pendingPayments: { count: number; amount: number; };
  overduePayments: { count: number; amount: number; };
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
  tenant: { firstName: string; lastName: string; email: string; };
  unit: { unitNumber: string; };
  property: { name: string; };
  verifiedBy: { firstName: string; lastName: string; } | null;
}

export default function PaymentsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState<string | null>(null);

  // Payments filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");

  // Tab
  const [activeTab, setActiveTab] = useState<"payments" | "bills">("payments");

  // Bills state
  const [bills, setBills] = useState<any[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [markingOverdue, setMarkingOverdue] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [previewSummary, setPreviewSummary] = useState<any>(null);
  const [billsSearch, setBillsSearch] = useState("");
  const [billsPropertyFilter, setBillsPropertyFilter] = useState("all");
  const [billsStatusFilter, setBillsStatusFilter] = useState("all");
  const [generateForm, setGenerateForm] = useState({
    propertyId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [billNotification, setBillNotification] = useState<any>({
    isOpen: false, type: "success", title: "", message: ""
  });

  // Notification
  const [notification, setNotification] = useState<{
    isOpen: boolean; type: "success" | "error"; title: string; message: string;
  }>({ isOpen: false, type: "success", title: "", message: "" });

  useEffect(() => { fetchData(); }, [statusFilter, verificationFilter]);

  useEffect(() => {
    if (activeTab === "bills") fetchBillsData();
  }, [activeTab, billsPropertyFilter, billsStatusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/payments/stats'),
        fetch(`/api/admin/payments/list?status=${statusFilter}&verificationStatus=${verificationFilter}`)
      ]);
      if (statsRes.ok) { const d = await statsRes.json(); setStats(d.stats); }
      if (paymentsRes.ok) { const d = await paymentsRes.json(); setPayments(d.payments); }
    } catch (error) {
      setNotification({ isOpen: true, type: "error", title: "Error", message: "Failed to load payment data" });
    } finally {
      setLoading(false);
    }
  };

  const fetchBillsData = async () => {
    setBillsLoading(true);
    try {
      const [billsRes, propsRes] = await Promise.all([
        fetch(`/api/admin/bills/list?propertyId=${billsPropertyFilter}&status=${billsStatusFilter}`),
        fetch('/api/admin/properties/list'),
      ]);
      if (billsRes.ok) { const d = await billsRes.json(); setBills(d.bills || []); }
      if (propsRes.ok) { const d = await propsRes.json(); setProperties(d.properties || []); }
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setBillsLoading(false);
    }
  };

  const handleMarkOverdue = async () => {
    setMarkingOverdue(true);
    try {
      const res = await fetch("/api/admin/bills/overdue", { method: "POST" });
      if (!res.ok) throw new Error("Failed to mark overdue");
      setBillNotification({ isOpen: true, type: "success", title: "Done!", message: "Overdue bills marked." });
      fetchBillsData();
    } catch (error: any) {
      setBillNotification({ isOpen: true, type: "error", title: "Error", message: error.message });
    } finally { setMarkingOverdue(false); }
  };

  const handleSendReminders = async () => {
    const pending = bills.filter(b => b.status === "OVERDUE" || b.status === "PENDING");
    if (pending.length === 0) return;
    setSendingReminders(true);
    try {
      const res = await fetch("/api/admin/bills/reminders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: billsPropertyFilter !== "all" ? billsPropertyFilter : undefined }),
      });
      if (!res.ok) throw new Error("Failed to send reminders");
      const data = await res.json();
      setBillNotification({ isOpen: true, type: "success", title: "Reminders Sent!", message: `Sent to ${data.sent || pending.length} tenants.` });
    } catch (error: any) {
      setBillNotification({ isOpen: true, type: "error", title: "Error", message: error.message });
    } finally { setSendingReminders(false); }
  };

  const handlePreviewBills = async () => {
    if (!generateForm.propertyId) {
      setBillNotification({ isOpen: true, type: "error", title: "Required", message: "Please select a property first." });
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/bills/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generateForm),
      });
      if (!res.ok) throw new Error("Failed to preview bills");
      const data = await res.json();
      setPreview(data.preview || []);
      setPreviewSummary(data.summary);
      setShowPreview(true);
    } catch (error: any) {
      setBillNotification({ isOpen: true, type: "error", title: "Error", message: error.message });
    } finally { setGenerating(false); }
  };

  const handleGenerateBills = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/bills/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generateForm),
      });
      if (!res.ok) throw new Error("Failed to generate bills");
      const data = await res.json();
      setBillNotification({ isOpen: true, type: "success", title: "Bills Generated!", message: `${data.generated || 0} bills created.` });
      setShowGenerateModal(false);
      setShowPreview(false);
      fetchBillsData();
    } catch (error: any) {
      setBillNotification({ isOpen: true, type: "error", title: "Error", message: error.message });
    } finally { setGenerating(false); }
  };

  const handleVerifyPayment = async (paymentId: string, verificationStatus: "APPROVED" | "DECLINED", notes?: string) => {
    setVerifyingPayment(paymentId);
    try {
      const res = await fetch("/api/admin/payments/verify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, verificationStatus, verificationNotes: notes || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to verify payment"); }
      setNotification({
        isOpen: true, type: "success",
        title: verificationStatus === "APPROVED" ? "Payment Approved!" : "Payment Declined",
        message: verificationStatus === "APPROVED"
          ? "Payment verified and bill marked as paid."
          : "Payment declined. Tenant will be notified.",
      });
      fetchData();
    } catch (error: any) {
      setNotification({ isOpen: true, type: "error", title: "Verification Failed", message: error.message });
    } finally { setVerifyingPayment(null); }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-500/10 text-green-400 border-green-500/30";
      case "PENDING": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "FAILED": return "bg-red-500/10 text-red-400 border-red-500/30";
      default: return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "bg-green-500/10 text-green-400 border-green-500/30";
      case "PENDING": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "DECLINED": return "bg-red-500/10 text-red-400 border-red-500/30";
      default: return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  const filteredPayments = payments.filter(p =>
    p.tenant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tenant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.unit.unitNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBills = bills.filter(b =>
    `${b.tenant?.firstName} ${b.tenant?.lastName}`.toLowerCase().includes(billsSearch.toLowerCase()) ||
    b.unit?.unitNumber?.toLowerCase().includes(billsSearch.toLowerCase())
  );

  const overdueCount = filteredBills.filter(b => b.status === "OVERDUE").length;
  const pendingCount = filteredBills.filter(b => b.status === "PENDING").length;
  const paidCount = filteredBills.filter(b => b.status === "PAID").length;

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
          <h1 className="text-3xl font-bold text-white">💰 Payments & Billing</h1>
          <p className="text-gray-400 mt-1">Payment tracking, verification, and bill management</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "payments" && (
            <button className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition">
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
          {activeTab === "bills" && (
            <>
              <button
                onClick={handleMarkOverdue}
                disabled={markingOverdue}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition disabled:opacity-50"
              >
                {markingOverdue ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                Mark Overdue
              </button>
              <button
                onClick={handleSendReminders}
                disabled={sendingReminders || (overdueCount + pendingCount) === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition disabled:opacity-50"
              >
                {sendingReminders ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Reminders ({overdueCount + pendingCount})
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white rounded-lg font-semibold shadow-lg transition-all"
              >
                <Zap className="h-5 w-5" />
                Generate Bills
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-gray-900/50 border border-gray-700 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "payments"
              ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg"
              : "text-gray-400 hover:text-white"
          }`}
        >
          💳 Payments
        </button>
        <button
          onClick={() => setActiveTab("bills")}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "bills"
              ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg"
              : "text-gray-400 hover:text-white"
          }`}
        >
          📄 Bills & Invoices
        </button>
      </div>

      {/* ============ PAYMENTS TAB ============ */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gray-900/50 border-green-500/20">
              <CardHeader>
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-400">{formatCurrency(stats?.totalRevenue || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">This Month</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <Clock className="h-4 w-4" />Pending Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-400">{stats?.pendingPayments.count || 0}</p>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(stats?.pendingPayments.amount || 0)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />Overdue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-400">{stats?.overduePayments.count || 0}</p>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(stats?.overduePayments.amount || 0)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />Collection Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-400">{stats?.collectionRate || 0}%</p>
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
              <CardDescription>{filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPayments.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">No payments found</p>
                  <p className="text-gray-500 text-sm mt-2">Payments will appear here when tenants make transactions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPayments.map((payment) => (
                    <div key={payment.id} className="p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500/50 transition">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">{payment.tenant.firstName} {payment.tenant.lastName}</h3>
                            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/30">Unit {payment.unit.unitNumber}</span>
                            <span className={`px-2 py-1 text-xs rounded border ${getStatusColor(payment.status)}`}>{payment.status}</span>
                            <span className={`px-2 py-1 text-xs rounded border ${getVerificationColor(payment.verificationStatus)}`}>{payment.verificationStatus}</span>
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
                          <div className="relative group cursor-pointer w-full h-48" onClick={() => setSelectedImage(payment.proofOfPaymentUrl)}>
                            <img src={payment.proofOfPaymentUrl} alt="Proof of payment" className="w-full h-full object-cover rounded-lg border border-gray-700" />
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
                          <p className="text-white text-sm">{payment.verifiedBy.firstName} {payment.verifiedBy.lastName}{payment.verifiedAt && ` on ${formatDate(payment.verifiedAt)}`}</p>
                        </div>
                      )}
                      {payment.verificationStatus === "PENDING" && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => { const notes = prompt("Add optional approval notes:"); handleVerifyPayment(payment.id, "APPROVED", notes || undefined); }}
                            disabled={verifyingPayment === payment.id}
                            className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {verifyingPayment === payment.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" />Approve Payment</>}
                          </button>
                          <button
                            onClick={() => { const notes = prompt("Reason for declining (required):"); if (notes?.trim()) handleVerifyPayment(payment.id, "DECLINED", notes); else alert("Please provide a reason"); }}
                            disabled={verifyingPayment === payment.id}
                            className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <X className="h-5 w-5" />Decline Payment
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
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
              <div className="relative max-w-4xl w-full">
                <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition">
                  <X className="h-6 w-6 text-white" />
                </button>
                <img src={selectedImage} alt="Proof of payment" className="w-full h-auto rounded-lg" onClick={(e) => e.stopPropagation()} />
              </div>
            </div>
          )}

          <NotificationModal
            isOpen={notification.isOpen}
            type={notification.type}
            title={notification.title}
            message={notification.message}
            onClose={() => setNotification({ ...notification, isOpen: false })}
          />
        </div>
      )}

      {/* ============ BILLS TAB ============ */}
      {activeTab === "bills" && (
        <div className="space-y-6">
          {/* Bills Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
              <p className="text-gray-400 text-xs font-medium">Total Bills</p>
              <p className="text-2xl font-bold text-white mt-1">{filteredBills.length}</p>
            </div>
            <div className="p-4 bg-green-900/30 border border-green-500/30 rounded-xl">
              <p className="text-green-300 text-xs font-medium">Paid</p>
              <p className="text-2xl font-bold text-white mt-1">{paidCount}</p>
            </div>
            <div className="p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-xl">
              <p className="text-yellow-300 text-xs font-medium">Pending</p>
              <p className="text-2xl font-bold text-white mt-1">{pendingCount}</p>
            </div>
            <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
              <p className="text-red-300 text-xs font-medium">Overdue</p>
              <p className="text-2xl font-bold text-white mt-1">{overdueCount}</p>
            </div>
          </div>

          {/* Bills Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tenant or unit..."
                value={billsSearch}
                onChange={(e) => setBillsSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <select
              value={billsPropertyFilter}
              onChange={(e) => setBillsPropertyFilter(e.target.value)}
              className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Properties</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select
              value={billsStatusFilter}
              onChange={(e) => setBillsStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          {/* Bills List */}
          {billsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No bills found. Click "Generate Bills" to create bills for a property.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBills.map((bill) => (
                <div key={bill.id} className="p-5 bg-gray-900/50 border border-gray-700 rounded-xl hover:border-purple-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-white font-semibold">{bill.tenant?.firstName} {bill.tenant?.lastName}</p>
                        <p className="text-gray-400 text-sm">{bill.unit?.unitNumber} · {bill.property?.name}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        bill.status === "PAID" ? "bg-green-500/10 text-green-400 border-green-500/30" :
                        bill.status === "OVERDUE" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                        "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                      }`}>{bill.status}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">{formatCurrency(bill.totalAmount)}</p>
                      <p className="text-gray-400 text-xs">Due: {new Date(bill.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="p-2 bg-gray-800 rounded-lg">
                      <p className="text-gray-400 text-xs">Rent</p>
                      <p className="text-white text-sm font-medium">{formatCurrency(bill.rentAmount)}</p>
                    </div>
                    <div className="p-2 bg-gray-800 rounded-lg">
                      <p className="text-gray-400 text-xs">Water</p>
                      <p className="text-white text-sm font-medium">{formatCurrency(bill.waterAmount)}</p>
                    </div>
                    <div className="p-2 bg-gray-800 rounded-lg">
                      <p className="text-gray-400 text-xs">Garbage</p>
                      <p className="text-white text-sm font-medium">{formatCurrency(bill.garbageAmount)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ GENERATE BILLS MODAL ============ */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-gray-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Zap className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Generate Bills</h3>
                  <p className="text-gray-400 text-sm">Create monthly bills for a property</p>
                </div>
              </div>
              <button onClick={() => { setShowGenerateModal(false); setShowPreview(false); }} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            {!showPreview ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 text-sm">💡 Bills are generated from rent + recorded water readings + garbage fees. Make sure utilities are recorded before generating.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Property *</label>
                  <select
                    value={generateForm.propertyId}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, propertyId: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Select a property...</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Month</label>
                    <select
                      value={generateForm.month}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
                    <select
                      value={generateForm.year}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowGenerateModal(false)} className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition">Cancel</button>
                  <button
                    onClick={handlePreviewBills}
                    disabled={generating || !generateForm.propertyId}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-500 hover:to-purple-400 transition disabled:opacity-50 font-semibold"
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Preview Bills"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {previewSummary && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-gray-800 rounded-lg text-center">
                      <p className="text-gray-400 text-xs">Tenants</p>
                      <p className="text-white font-bold text-lg">{previewSummary.totalTenants}</p>
                    </div>
                    <div className="p-3 bg-gray-800 rounded-lg text-center">
                      <p className="text-gray-400 text-xs">Total Amount</p>
                      <p className="text-purple-400 font-bold text-lg">{formatCurrency(previewSummary.totalAmount)}</p>
                    </div>
                    <div className="p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg text-center">
                      <p className="text-yellow-300 text-xs">Already Exist</p>
                      <p className="text-white font-bold text-lg">{preview.filter(p => p.billExists).length}</p>
                    </div>
                  </div>
                )}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {preview.map((item, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${item.billExists ? "bg-yellow-900/20 border-yellow-500/30" : "bg-gray-800 border-gray-700"}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{item.tenant.name} — Unit {item.unit.number}</p>
                          <p className="text-gray-400 text-xs">Rent: {formatCurrency(item.breakdown.rent)} · Water: {formatCurrency(item.breakdown.water)} · Garbage: {formatCurrency(item.breakdown.garbage)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">{formatCurrency(item.breakdown.total)}</p>
                          {item.billExists && <span className="text-yellow-400 text-xs">Bill exists</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowPreview(false)} className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition">Back</button>
                  <button
                    onClick={handleGenerateBills}
                    disabled={generating}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-500 hover:to-green-400 transition disabled:opacity-50 font-semibold"
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `Confirm & Generate ${preview.filter(p => !p.billExists).length} Bills`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bill Notification Toast */}
      {billNotification.isOpen && (
        <div className="fixed bottom-4 right-4 z-[10000] flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg bg-gray-900 border border-gray-700">
          {billNotification.type === "success" ? <CheckCircle className="h-5 w-5 text-green-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
          <div>
            <p className="text-white font-medium text-sm">{billNotification.title}</p>
            <p className="text-gray-400 text-xs">{billNotification.message}</p>
          </div>
          <button onClick={() => setBillNotification((p: any) => ({ ...p, isOpen: false }))} className="ml-4 text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
