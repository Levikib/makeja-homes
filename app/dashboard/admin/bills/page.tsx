"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Loader2,
  DollarSign,
  Calendar,
  Eye,
  FileText,
  Download,
  Filter,
  Search,
  Zap,
  CheckCircle,
  Clock,
  XCircle,
  Bell,
  Send,
} from "lucide-react";
import NotificationModal from "@/components/NotificationModal";

interface Property {
  id: string;
  name: string;
}

interface Bill {
  id: string;
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
  month: string;
  rentAmount: number;
  waterAmount: number;
  garbageAmount: number;
  totalAmount: number;
  status: string;
  dueDate: string;
  paidDate: string | null;
  createdAt: string;
}

interface PreviewItem {
  tenant: {
    id: string;
    name: string;
    email: string;
  };
  unit: {
    number: string;
  };
  breakdown: {
    rent: number;
    water: number;
    garbage: number;
    recurringCharges: Array<{ name: string; amount: number }>;
    recurringChargesTotal: number;
    total: number;
  };
  billExists: boolean;
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [markingOverdue, setMarkingOverdue] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [previewSummary, setPreviewSummary] = useState<any>(null);

  // Filters
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Generation form
  const [generateForm, setGenerateForm] = useState({
    propertyId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
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

  useEffect(() => {
    fetchData();
    fetchProperties();
  }, [propertyFilter, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/bills/list?propertyId=${propertyFilter}&status=${statusFilter}`
      );
      if (response.ok) {
        const data = await response.json();
        setBills(data.bills);
      }
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await fetch("/api/admin/properties");
      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties || []);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  const handleMarkOverdue = async () => {
    if (!confirm("Mark all past-due bills as OVERDUE?")) return;

    setMarkingOverdue(true);
    try {
      const response = await fetch("/api/admin/bills/overdue/mark", {
        method: "POST"
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to mark overdue bills");
      }

      const data = await response.json();

      setNotification({
        isOpen: true,
        type: "success",
        title: "Overdue Bills Marked",
        message: `Successfully marked ${data.count} bills as overdue`,
      });

      fetchData();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: error.message,
      });
    } finally {
      setMarkingOverdue(false);
    }
  };

  const handleSendBulkReminders = async () => {
    // Get overdue bills (filtered or all)
    const overdueBills = filteredBills.filter(b => 
      b.status === "OVERDUE" || b.status === "PENDING"
    );

    if (overdueBills.length === 0) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "No Bills to Remind",
        message: "No pending or overdue bills found to send reminders",
      });
      return;
    }

    const confirmMsg = propertyFilter !== "all"
      ? `Send payment reminders to ${overdueBills.length} tenant(s) in the selected property?`
      : `Send payment reminders to ${overdueBills.length} tenant(s) across all properties?`;

    if (!confirm(confirmMsg)) return;

    setSendingReminders(true);
    try {
      const response = await fetch("/api/admin/bills/reminders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billIds: overdueBills.map(b => b.id),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send reminders");
      }

      const data = await response.json();

      setNotification({
        isOpen: true,
        type: "success",
        title: "Reminders Sent!",
        message: data.message,
      });
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: error.message,
      });
    } finally {
      setSendingReminders(false);
    }
  };

  const handlePreview = async () => {
    if (!generateForm.propertyId) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Please select a property",
      });
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/admin/bills/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generateForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate preview");
      }

      const data = await response.json();
      setPreview(data.preview);
      setPreviewSummary(data.summary);
      setShowPreview(true);
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Preview Failed",
        message: error.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/admin/bills/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generateForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate bills");
      }

      const data = await response.json();
      
      setNotification({
        isOpen: true,
        type: "success",
        title: "Bills Generated!",
        message: data.message,
      });

      setShowGenerateModal(false);
      setShowPreview(false);
      fetchData();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Generation Failed",
        message: error.message,
      });
    } finally {
      setGenerating(false);
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
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-500/10 text-green-400 border-green-500/30";
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "OVERDUE":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return <CheckCircle className="h-4 w-4" />;
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "OVERDUE":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const filteredBills = bills.filter(
    (bill) =>
      bill.tenant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.tenant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.unit.unitNumber.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-white">📄 Bills Management</h1>
          <p className="text-gray-400 mt-1">Generate and manage monthly bills</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleMarkOverdue}
            disabled={markingOverdue}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition disabled:opacity-50"
          >
            {markingOverdue ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            Mark Overdue
          </button>
          <button
            onClick={handleSendBulkReminders}
            disabled={sendingReminders || (overdueCount + pendingCount) === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition disabled:opacity-50"
          >
            {sendingReminders ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Reminders ({overdueCount + pendingCount})
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white rounded-lg font-semibold shadow-lg hover:shadow-purple-500/50 hover:scale-105 transition-all duration-200"
          >
            <Zap className="h-5 w-5" />
            Generate Bills
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Bills</p>
                <p className="text-2xl font-bold text-white">{filteredBills.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Paid</p>
                <p className="text-2xl font-bold text-green-400">{paidCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Overdue</p>
                <p className="text-2xl font-bold text-red-400">{overdueCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
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
                placeholder="Search tenant, unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      <div className="space-y-4">
        {filteredBills.length === 0 ? (
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">No bills found</p>
              <p className="text-gray-500 text-sm mt-2">
                Generate bills to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredBills.map((bill) => (
            <Card key={bill.id} className="bg-gray-900/50 border-gray-700 hover:border-purple-500/50 transition">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {bill.tenant.firstName} {bill.tenant.lastName}
                      </h3>
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/30">
                        Unit {bill.unit.unitNumber}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded border flex items-center gap-1 ${getStatusColor(bill.status)}`}>
                        {getStatusIcon(bill.status)}
                        {bill.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{bill.property.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(bill.totalAmount)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(bill.month).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Rent</p>
                    <p className="text-white font-semibold">{formatCurrency(bill.rentAmount)}</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Water</p>
                    <p className="text-white font-semibold">{formatCurrency(bill.waterAmount)}</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Garbage</p>
                    <p className="text-white font-semibold">{formatCurrency(bill.garbageAmount)}</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Due Date</p>
                    <p className="text-white text-sm">{formatDate(bill.dueDate)}</p>
                  </div>
                </div>

                {bill.paidDate && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-xs text-green-400 font-medium">
                      Paid on {formatDate(bill.paidDate)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Generate Bills Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-gray-900 border-gray-700 w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="text-white text-2xl">Generate Monthly Bills</CardTitle>
              <CardDescription>
                Automatically generate bills for all tenants in a property
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400 font-medium mb-2">📊 What will be included:</p>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>✅ Monthly rent (from lease agreement)</li>
                  <li>✅ Water charges (from latest readings)</li>
                  <li>✅ Garbage fees (if applicable)</li>
                  <li>✅ Recurring charges (security, maintenance, etc.)</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Property *
                </label>
                <select
                  value={generateForm.propertyId}
                  onChange={(e) =>
                    setGenerateForm({ ...generateForm, propertyId: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  required
                >
                  <option value="">Select Property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Month *
                  </label>
                  <select
                    value={generateForm.month}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, month: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString("default", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Year *
                  </label>
                  <input
                    type="number"
                    value={generateForm.year}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, year: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePreview}
                  disabled={generating}
                  className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Eye className="h-5 w-5" />
                      Preview Bills
                    </>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewSummary && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="bg-gray-900 border-gray-700 w-full max-w-4xl my-8">
            <CardHeader>
              <CardTitle className="text-white text-2xl">Bill Generation Preview</CardTitle>
              <CardDescription>
                Review before generating {previewSummary?.newBillsToGenerate} new bills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-400 mb-1">Total Tenants</p>
                  <p className="text-2xl font-bold text-white">{previewSummary?.totalTenants}</p>
                </div>
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-xs text-green-400 mb-1">New Bills</p>
                  <p className="text-2xl font-bold text-white">{previewSummary?.newBillsToGenerate}</p>
                </div>
                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-xs text-purple-400 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(previewSummary?.totalAmount || 0)}
                  </p>
                </div>
              </div>

              {/* Preview List */}
              <div className="max-h-96 overflow-y-auto space-y-3">
                {preview.map((item, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      item.billExists
                        ? "bg-yellow-500/5 border-yellow-500/20"
                        : "bg-gray-800 border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white font-medium">{item.tenant.name}</p>
                        <p className="text-gray-400 text-sm">Unit {item.unit.number}</p>
                      </div>
                      {item.billExists && (
                        <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded border border-yellow-500/30">
                          Already Exists
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs">Rent</p>
                        <p className="text-white">{formatCurrency(item.breakdown.rent)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Water</p>
                        <p className="text-white">{formatCurrency(item.breakdown.water)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Garbage</p>
                        <p className="text-white">{formatCurrency(item.breakdown.garbage)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Total</p>
                        <p className="text-white font-bold">{formatCurrency(item.breakdown.total)}</p>
                      </div>
                    </div>
                    {item.breakdown.recurringCharges.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Additional Charges:</p>
                        <div className="flex flex-wrap gap-1">
                          {item.breakdown.recurringCharges.map((charge, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded"
                            >
                              {charge.name}: {formatCurrency(charge.amount)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Back to Edit
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating || previewSummary?.newBillsToGenerate === 0}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      Generate {previewSummary?.newBillsToGenerate} Bills
                    </>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
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
  );
}
