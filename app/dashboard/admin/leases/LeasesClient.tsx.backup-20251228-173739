"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  ChevronDown,
  Calendar,
  DollarSign,
  MapPin,
  User,
  FileText,
  Edit,
  RotateCw,
  XCircle,
  Eye,
  Receipt,
  PlusCircle,
  Download,
  UserCircle,
  X,
  Check,
  AlertTriangle
} from "lucide-react";

interface Lease {
  id: string;
  tenantId: string;
  unitId: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  terms?: string;
  unit: {
    unitNumber: string;
    property: {
      id: string;
      name: string;
    };
  };
  tenant: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

interface Property {
  id: string;
  name: string;
}

export default function LeasesClient() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [filteredLeases, setFilteredLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [viewModal, setViewModal] = useState<Lease | null>(null);
  const [editModal, setEditModal] = useState<Lease | null>(null);
  const [renewModal, setRenewModal] = useState<Lease | null>(null);
  const [paymentsModal, setPaymentsModal] = useState<Lease | null>(null);
  const [payModal, setPayModal] = useState<Lease | null>(null);
  const [terminateModal, setTerminateModal] = useState<Lease | null>(null);

  // Form states
  const [editForm, setEditForm] = useState({
    endDate: "",
    monthlyRent: "",
    depositAmount: "",
    terms: ""
  });

  const [renewForm, setRenewForm] = useState({
    startDate: "",
    endDate: "",
    monthlyRent: "",
    depositAmount: ""
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: "CASH",
    reference: ""
  });

  useEffect(() => {
    fetchLeases();
    fetchProperties();
  }, []);

  useEffect(() => {
    filterLeases();
  }, [leases, searchTerm, statusFilter, propertyFilter]);

  const fetchLeases = async () => {
    try {
      const res = await fetch("/api/leases");
      if (!res.ok) {
        console.error("Failed to fetch leases:", res.status);
        setLeases([]);
        return;
      }
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setLeases(data);
      } else {
        console.error("API returned non-array data:", data);
        setLeases([]);
      }
    } catch (error) {
      console.error("Failed to fetch leases:", error);
      setLeases([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch("/api/properties");
      const data = await res.json();
      setProperties(data);
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    }
  };

  const filterLeases = () => {
    let filtered = leases;

    if (searchTerm) {
      filtered = filtered.filter((lease) => {
        const tenantName = `${lease.tenant.user.firstName} ${lease.tenant.user.lastName}`.toLowerCase();
        const unitNumber = lease.unit.unitNumber.toLowerCase();
        const propertyName = lease.unit.property.name.toLowerCase();
        const search = searchTerm.toLowerCase();
        
        return (
          tenantName.includes(search) ||
          unitNumber.includes(search) ||
          propertyName.includes(search)
        );
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((lease) => lease.status === statusFilter);
    }

    if (propertyFilter !== "all") {
      filtered = filtered.filter((lease) => lease.unit.property.id === propertyFilter);
    }

    setFilteredLeases(filtered);
  };

  // Action Handlers
  const handleView = (lease: Lease) => {
    setViewModal(lease);
  };

  const handleEdit = (lease: Lease) => {
    setEditForm({
      endDate: lease.endDate.split('T')[0],
      monthlyRent: lease.monthlyRent.toString(),
      depositAmount: lease.depositAmount.toString(),
      terms: lease.terms || ""
    });
    setEditModal(lease);
  };

  const handleRenew = (lease: Lease) => {
    const newStartDate = new Date(lease.endDate);
    newStartDate.setDate(newStartDate.getDate() + 1);
    const newEndDate = new Date(newStartDate);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);

    setRenewForm({
      startDate: newStartDate.toISOString().split('T')[0],
      endDate: newEndDate.toISOString().split('T')[0],
      monthlyRent: lease.monthlyRent.toString(),
      depositAmount: lease.depositAmount.toString()
    });
    setRenewModal(lease);
  };

  const handlePayments = (lease: Lease) => {
    setPaymentsModal(lease);
  };

  const handlePay = (lease: Lease) => {
    setPaymentForm({
      amount: lease.monthlyRent.toString(),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: "CASH",
      reference: ""
    });
    setPayModal(lease);
  };

  const handleDownloadContract = async (lease: Lease) => {
    alert(`Downloading contract for ${lease.tenant.user.firstName} ${lease.tenant.user.lastName}...`);
    // TODO: Implement PDF generation
  };

  const handleViewTenant = (lease: Lease) => {
    window.location.href = `/dashboard/admin/tenants?id=${lease.tenantId}`;
  };

  const handleTerminate = (lease: Lease) => {
    setTerminateModal(lease);
  };

  // API Actions
  const submitEdit = async () => {
    if (!editModal) return;

    try {
      const res = await fetch(`/api/leases/${editModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endDate: new Date(editForm.endDate).toISOString(),
          rentAmount: parseFloat(editForm.monthlyRent),
          depositAmount: parseFloat(editForm.depositAmount),
          terms: editForm.terms
        })
      });

      if (res.ok) {
        alert("Lease updated successfully!");
        setEditModal(null);
        fetchLeases();
      } else {
        alert("Failed to update lease");
      }
    } catch (error) {
      console.error("Error updating lease:", error);
      alert("Error updating lease");
    }
  };

  const submitRenewal = async () => {
    if (!renewModal) return;

    try {
      const res = await fetch("/api/leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: renewModal.tenantId,
          unitId: renewModal.unitId,
          startDate: new Date(renewForm.startDate).toISOString(),
          endDate: new Date(renewForm.endDate).toISOString(),
          rentAmount: parseFloat(renewForm.monthlyRent),
          depositAmount: parseFloat(renewForm.depositAmount),
          status: "ACTIVE"
        })
      });

      if (res.ok) {
        alert("Lease renewed successfully!");
        setRenewModal(null);
        fetchLeases();
      } else {
        alert("Failed to renew lease");
      }
    } catch (error) {
      console.error("Error renewing lease:", error);
      alert("Error renewing lease");
    }
  };

  const submitPayment = async () => {
    if (!payModal) return;

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: payModal.tenantId,
          unitId: payModal.unitId,
          leaseId: payModal.id,
          amount: parseFloat(paymentForm.amount),
          paymentDate: new Date(paymentForm.paymentDate).toISOString(),
          paymentMethod: paymentForm.paymentMethod,
          reference: paymentForm.reference,
          status: "COMPLETED"
        })
      });

      if (res.ok) {
        alert("Payment recorded successfully!");
        setPayModal(null);
        setPaymentForm({
          amount: "",
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: "CASH",
          reference: ""
        });
      } else {
        alert("Failed to record payment");
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("Error recording payment");
    }
  };

  const submitTermination = async () => {
    if (!terminateModal) return;

    try {
      const res = await fetch(`/api/leases/${terminateModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "TERMINATED",
          endDate: new Date().toISOString()
        })
      });

      if (res.ok) {
        alert("Lease terminated successfully!");
        setTerminateModal(null);
        fetchLeases();
      } else {
        alert("Failed to terminate lease");
      }
    } catch (error) {
      console.error("Error terminating lease:", error);
      alert("Error terminating lease");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400";
      case "EXPIRED":
        return "from-red-500/20 to-rose-500/20 border-red-500/30 text-red-400";
      case "PENDING":
        return "from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-400";
      case "TERMINATED":
        return "from-gray-500/20 to-slate-500/20 border-gray-500/30 text-gray-400";
      default:
        return "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE": return "✓";
      case "EXPIRED": return "⚠";
      case "PENDING": return "⏱";
      case "TERMINATED": return "✕";
      default: return "•";
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getTimeWarningColor = (days: number) => {
    if (days < 0) return "text-red-400";
    if (days < 30) return "text-red-400";
    if (days < 90) return "text-yellow-400";
    return "text-green-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-cyan-400 text-xl">Loading leases...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-cyan-400">Lease Agreements</h2>
          <p className="text-gray-400 text-sm mt-1">
            {filteredLeases.length} {filteredLeases.length === 1 ? "lease" : "leases"} found
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20 transition-all"
        >
          <Filter size={20} />
          Filters
          <ChevronDown
            size={16}
            className={`transform transition-transform ${showFilters ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search tenant, unit, property..."
                      className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="PENDING">Pending</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Property</label>
                  <select
                    value={propertyFilter}
                    onChange={(e) => setPropertyFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="all">All Properties</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leases Grid */}
      {filteredLeases.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={64} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No leases found</h3>
          <p className="text-gray-500">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeases.map((lease, index) => {
            const daysRemaining = getDaysRemaining(lease.endDate);
            return (
              <motion.div
                key={lease.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-6 hover:border-cyan-500/40 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r border ${getStatusColor(lease.status)}`}>
                    <span className="mr-1">{getStatusIcon(lease.status)}</span>
                    {lease.status}
                  </div>
                  <div className="text-xs text-gray-500">#{lease.id.slice(0, 8)}</div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User size={16} className="text-cyan-400" />
                    <h3 className="text-lg font-semibold text-white">
                      {lease.tenant.user.firstName} {lease.tenant.user.lastName}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-400">{lease.tenant.user.email}</p>
                </div>

                <div className="flex items-center gap-2 mb-4 text-gray-300">
                  <MapPin size={16} className="text-purple-400" />
                  <span className="text-sm">
                    {lease.unit.property.name} - Unit {lease.unit.unitNumber}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Start Date:</span>
                    <span className="text-gray-300">
                      {new Date(lease.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">End Date:</span>
                    <span className="text-gray-300">
                      {new Date(lease.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  {lease.status === "ACTIVE" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Days Remaining:</span>
                      <span className={`font-semibold ${getTimeWarningColor(daysRemaining)}`}>
                        {daysRemaining > 0 ? `${daysRemaining} days` : "Expired"}
                      </span>
                    </div>
                  )}
                </div>

                {lease.status === "ACTIVE" && (
                  <div className="mb-4">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          daysRemaining < 30
                            ? "bg-gradient-to-r from-red-500 to-rose-500"
                            : daysRemaining < 90
                            ? "bg-gradient-to-r from-yellow-500 to-amber-500"
                            : "bg-gradient-to-r from-green-500 to-emerald-500"
                        }`}
                        style={{
                          width: `${Math.max(0, Math.min(100, (daysRemaining / ((new Date(lease.endDate).getTime() - new Date(lease.startDate).getTime()) / (1000 * 60 * 60 * 24))) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign size={14} className="text-cyan-400" />
                      <span className="text-xs text-gray-400">Monthly Rent</span>
                    </div>
                    <p className="text-lg font-bold text-cyan-400">
                      KES {lease.monthlyRent.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign size={14} className="text-purple-400" />
                      <span className="text-xs text-gray-400">Deposit</span>
                    </div>
                    <p className="text-lg font-bold text-purple-400">
                      KES {lease.depositAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-700/50 pt-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleView(lease)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20 transition-all text-sm"
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </button>
                    <button 
                      onClick={() => handleEdit(lease)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg text-blue-400 hover:from-blue-500/20 hover:to-purple-500/20 transition-all text-sm"
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => handleRenew(lease)}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg text-green-400 hover:from-green-500/20 hover:to-emerald-500/20 transition-all text-xs"
                      title="Renew Lease"
                    >
                      <RotateCw size={12} />
                      <span>Renew</span>
                    </button>
                    <button 
                      onClick={() => handlePayments(lease)}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 hover:from-yellow-500/20 hover:to-amber-500/20 transition-all text-xs"
                      title="View Payments"
                    >
                      <Receipt size={12} />
                      <span>Payments</span>
                    </button>
                    <button 
                      onClick={() => handlePay(lease)}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg text-purple-400 hover:from-purple-500/20 hover:to-pink-500/20 transition-all text-xs"
                      title="Add Payment"
                    >
                      <PlusCircle size={12} />
                      <span>Pay</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => handleDownloadContract(lease)}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border border-indigo-500/30 rounded-lg text-indigo-400 hover:from-indigo-500/20 hover:to-blue-500/20 transition-all text-xs"
                      title="Download Contract"
                    >
                      <Download size={12} />
                      <span>Contract</span>
                    </button>
                    <button 
                      onClick={() => handleViewTenant(lease)}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 hover:from-cyan-500/20 hover:to-teal-500/20 transition-all text-xs"
                      title="View Tenant Profile"
                    >
                      <UserCircle size={12} />
                      <span>Tenant</span>
                    </button>
                    <button 
                      onClick={() => handleTerminate(lease)}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 rounded-lg text-red-400 hover:from-red-500/20 hover:to-rose-500/20 transition-all text-xs"
                      title="Terminate Lease"
                    >
                      <XCircle size={12} />
                      <span>End</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* View Modal */}
      <AnimatePresence>
        {viewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setViewModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-cyan-500/30 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-cyan-400">Lease Details</h3>
                <button
                  onClick={() => setViewModal(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm">Lease ID</label>
                    <p className="text-white font-mono">{viewModal.id}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Status</label>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r border ${getStatusColor(viewModal.status)} mt-1`}>
                      {viewModal.status}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-lg font-semibold text-white mb-3">Tenant Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm">Name</label>
                      <p className="text-white">{viewModal.tenant.user.firstName} {viewModal.tenant.user.lastName}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Email</label>
                      <p className="text-white">{viewModal.tenant.user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-lg font-semibold text-white mb-3">Property & Unit</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm">Property</label>
                      <p className="text-white">{viewModal.unit.property.name}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Unit Number</label>
                      <p className="text-white">{viewModal.unit.unitNumber}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-lg font-semibold text-white mb-3">Lease Terms</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm">Start Date</label>
                      <p className="text-white">{new Date(viewModal.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">End Date</label>
                      <p className="text-white">{new Date(viewModal.endDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Monthly Rent</label>
                      <p className="text-white">KES {viewModal.monthlyRent.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Deposit Amount</label>
                      <p className="text-white">KES {viewModal.depositAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {viewModal.terms && (
                  <div className="border-t border-gray-700 pt-4">
                    <label className="text-gray-400 text-sm">Additional Terms</label>
                    <p className="text-white mt-2 whitespace-pre-wrap">{viewModal.terms}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setViewModal(null)}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setEditModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-cyan-500/30 rounded-lg p-6 max-w-2xl w-full"
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-cyan-400">Edit Lease</h3>
                <button
                  onClick={() => setEditModal(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Monthly Rent (KES)</label>
                    <input
                      type="number"
                      value={editForm.monthlyRent}
                      onChange={(e) => setEditForm({ ...editForm, monthlyRent: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Deposit Amount (KES)</label>
                    <input
                      type="number"
                      value={editForm.depositAmount}
                      onChange={(e) => setEditForm({ ...editForm, depositAmount: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Additional Terms</label>
                  <textarea
                    value={editForm.terms}
                    onChange={(e) => setEditForm({ ...editForm, terms: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setEditModal(null)}
                  className="px-6 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={submitEdit}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg text-white hover:from-cyan-600 hover:to-blue-600 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Renew Modal */}
      <AnimatePresence>
        {renewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setRenewModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-green-500/30 rounded-lg p-6 max-w-2xl w-full"
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-green-400">Renew Lease</h3>
                <button
                  onClick={() => setRenewModal(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">New Start Date</label>
                    <input
                      type="date"
                      value={renewForm.startDate}
                      onChange={(e) => setRenewForm({ ...renewForm, startDate: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">New End Date</label>
                    <input
                      type="date"
                      value={renewForm.endDate}
                      onChange={(e) => setRenewForm({ ...renewForm, endDate: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Monthly Rent (KES)</label>
                    <input
                      type="number"
                      value={renewForm.monthlyRent}
                      onChange={(e) => setRenewForm({ ...renewForm, monthlyRent: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Deposit Amount (KES)</label>
                    <input
                      type="number"
                      value={renewForm.depositAmount}
                      onChange={(e) => setRenewForm({ ...renewForm, depositAmount: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-green-400 text-sm">
                    <strong>Note:</strong> This will create a new lease agreement. The current lease will remain unchanged.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setRenewModal(null)}
                  className="px-6 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRenewal}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white hover:from-green-600 hover:to-emerald-600 transition-all"
                >
                  Create Renewal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {payModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setPayModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-purple-500/30 rounded-lg p-6 max-w-2xl w-full"
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-purple-400">Record Payment</h3>
                <button
                  onClick={() => setPayModal(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Amount (KES)</label>
                    <input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Payment Date</label>
                    <input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="MPESA">M-Pesa</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Reference Number (Optional)</label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    placeholder="Transaction ID, Receipt Number, etc."
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setPayModal(null)}
                  className="px-6 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPayment}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  Record Payment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payments History Modal */}
      <AnimatePresence>
        {paymentsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setPaymentsModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-yellow-500/30 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-yellow-400">Payment History</h3>
                <button
                  onClick={() => setPaymentsModal(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-400">
                  Tenant: <span className="text-white font-semibold">
                    {paymentsModal.tenant.user.firstName} {paymentsModal.tenant.user.lastName}
                  </span>
                </p>
                <p className="text-gray-400">
                  Unit: <span className="text-white font-semibold">
                    {paymentsModal.unit.property.name} - {paymentsModal.unit.unitNumber}
                  </span>
                </p>
              </div>

              <div className="text-center py-12">
                <Receipt size={64} className="mx-auto text-gray-600 mb-4" />
                <h4 className="text-xl font-semibold text-gray-400 mb-2">Payment History</h4>
                <p className="text-gray-500">This feature will fetch and display all payments for this lease</p>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setPaymentsModal(null)}
                  className="px-6 py-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 hover:from-yellow-500/20 hover:to-amber-500/20 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminate Modal */}
      <AnimatePresence>
        {terminateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setTerminateModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-red-500/30 rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={32} className="text-red-400" />
                  <h3 className="text-2xl font-bold text-red-400">Terminate Lease</h3>
                </div>
                <button
                  onClick={() => setTerminateModal(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-300">
                  Are you sure you want to terminate this lease?
                </p>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 text-sm">
                    <strong>Warning:</strong> This action will immediately end the lease agreement and mark the unit as vacant. This cannot be undone.
                  </p>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <p className="text-gray-400 text-sm">Tenant: <span className="text-white">{terminateModal.tenant.user.firstName} {terminateModal.tenant.user.lastName}</span></p>
                  <p className="text-gray-400 text-sm">Unit: <span className="text-white">{terminateModal.unit.property.name} - {terminateModal.unit.unitNumber}</span></p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setTerminateModal(null)}
                  className="px-6 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={submitTermination}
                  className="px-6 py-2 bg-gradient-to-r from-red-500 to-rose-500 rounded-lg text-white hover:from-red-600 hover:to-rose-600 transition-all"
                >
                  Terminate Lease
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
