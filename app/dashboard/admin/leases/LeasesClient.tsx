"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  Edit,
  RotateCw,
  XCircle,
  Search,
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Home,
  User,
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import ExpiringLeasesAlert from "@/components/dashboard/expiring-leases-alert";
import NotificationModal from "@/components/NotificationModal";

interface Lease {
  id: string;
  tenantId: string;
  unitId: string;
  status: string;
  startDate: Date;
  endDate: Date;
  updatedAt: Date;
  rentAmount: number;
  depositAmount: number;
  terms?: string;
  contractSentAt?: Date | null;
  contractViewedAt?: Date | null;
  contractSignedAt?: Date | null;
  contractSignedBy?: string | null;
  signatureToken?: string | null;
  contractTerms?: string | null;
  tenant: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  unit: {
    unitNumber: string;
    property: {
      id: string;
      name: string;
    };
  };
}

interface Property {
  id: string;
  name: string;
}

interface LeasesClientProps {
  leases: Lease[];
  properties: Property[];
}

// Helper function to get effective end date
const getEffectiveEndDate = (lease: Lease): Date => {
  return lease.status === "TERMINATED" 
    ? new Date(lease.updatedAt) 
    : new Date(lease.endDate);
};

export default function LeasesClient({ leases: initialLeases, properties }: LeasesClientProps) {
  const [leases, setLeases] = useState(initialLeases);
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [viewModal, setViewModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [renewModal, setRenewModal] = useState(false);

  const [endModal, setEndModal] = useState(false);

  const [editForm, setEditForm] = useState({
    startDate: "",
    endDate: "",
    rentAmount: "",
    depositAmount: "",
    terms: "",
    contractTemplate: "",
  });

  const [renewForm, setRenewForm] = useState({
    startDate: "",
    endDate: "",
    rentAmount: "",
    depositAmount: "",
  });

  const [notification, setNotification] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  // Filter leases by property first
  const propertyFilteredLeases = useMemo(() => {
    if (!propertyFilter) return leases;
    return leases.filter(l => l.unit.property.id === propertyFilter);
  }, [leases, propertyFilter]);

  // Stats - REACTIVE to property filter
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const leasesToCount = propertyFilteredLeases;

    const active = leasesToCount.filter(l => l.status === "ACTIVE");
    const pending = leasesToCount.filter(l => l.status === "PENDING");
    const terminated = leasesToCount.filter(l => l.status === "TERMINATED");

    const expiring = active.filter(l => {
      const endDate = new Date(l.endDate);
      endDate.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    });

    const monthlyRevenue = active.reduce((sum, l) => sum + l.rentAmount, 0);

    return {
      total: leasesToCount.length,
      active: active.length,
      pending: pending.length,
      expiring: expiring.length,
      terminated: terminated.length,
      monthlyRevenue,
    };
  }, [propertyFilteredLeases]);

  // Full filtered leases (property + status + search)
  const filteredLeases = useMemo(() => {
    return propertyFilteredLeases.filter((lease) => {
      const matchesSearch =
        lease.tenant.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lease.tenant.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lease.unit.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lease.unit.property.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = !statusFilter || lease.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [propertyFilteredLeases, searchTerm, statusFilter]);

  const openViewModal = (lease: Lease) => {
    setSelectedLease(lease);
    setViewModal(true);
  };

  const openEditModal = (lease: Lease) => {
    setSelectedLease(lease);

    const effectiveEndDate = getEffectiveEndDate(lease);

    // Generate contract template
    const contractTemplate = `RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on ${new Date().toLocaleDateString()} between:

LANDLORD: Makeja Homes
Property Management Company

TENANT: ${lease.tenant.user.firstName} ${lease.tenant.user.lastName}
Email: ${lease.tenant.user.email}

PROPERTY DETAILS:
Property: ${lease.unit.property.name}
Unit: ${lease.unit.unitNumber}

LEASE TERMS:
1. TERM: This lease shall commence on ${new Date(lease.startDate).toLocaleDateString()} and terminate on ${effectiveEndDate.toLocaleDateString()}.

2. RENT: Tenant agrees to pay monthly rent of KSH ${lease.rentAmount.toLocaleString()} due on the 1st day of each month.

3. SECURITY DEPOSIT: Tenant has paid a security deposit of KSH ${lease.depositAmount.toLocaleString()}.

4. USE OF PREMISES: The premises shall be used solely for residential purposes.

5. UTILITIES: Tenant is responsible for payment of electricity, water, and other utilities.

6. MAINTENANCE: Tenant agrees to maintain the premises in good condition and report any damages immediately.

7. PETS: No pets allowed without prior written consent from landlord.

8. SUBLETTING: Tenant shall not sublet the premises without written consent from landlord.

9. TERMINATION: Either party may terminate this agreement with 30 days written notice.

10. GOVERNING LAW: This agreement shall be governed by the laws of Kenya.

${lease.terms ? '\nADDITIONAL TERMS:\n' + lease.terms : ''}

By signing this agreement digitally, tenant acknowledges having read, understood, and agreed to all terms and conditions stated above.`;

    setEditForm({
      startDate: new Date(lease.startDate).toISOString().split("T")[0],
      endDate: new Date(lease.endDate).toISOString().split("T")[0],
      rentAmount: lease.rentAmount.toString(),
      depositAmount: lease.depositAmount.toString(),
      terms: lease.terms || "",
      contractTemplate: contractTemplate,
    });
    setEditModal(true);
  };

  const openRenewModal = (lease: Lease) => {
    setSelectedLease(lease);
    const today = new Date();
    const oneYearLater = new Date(today);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    setRenewForm({
      startDate: today.toISOString().split("T")[0],
      endDate: oneYearLater.toISOString().split("T")[0],
      rentAmount: lease.rentAmount.toString(),
      depositAmount: lease.depositAmount.toString(),
    });
    setRenewModal(true);
  };

  const openEndModal = (lease: Lease) => {
    setSelectedLease(lease);
    setEndModal(true);
  };

  const handleEdit = async () => {
    if (!selectedLease) return;

    try {
      const response = await fetch(`/api/leases/${selectedLease.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: editForm.startDate,
          endDate: editForm.endDate,
          rentAmount: parseFloat(editForm.rentAmount),
          depositAmount: parseFloat(editForm.depositAmount),
          terms: editForm.terms,
          contractTerms: editForm.contractTemplate,
        }),
      });

      if (response.ok) {
        setNotification({
          isOpen: true,
          type: "success",
          title: "Lease Updated!",
          message: "Lease terms updated successfully.",
        });
        setEditModal(false);
        window.location.reload();
      } else {
        throw new Error();
      }
    } catch (error) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Update Failed",
        message: "Failed to update lease.",
      });
    }
  };

  const handleRenew = async () => {
    if (!selectedLease) return;

    try {
      const response = await fetch(`/api/leases/${selectedLease.id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: renewForm.startDate,
          endDate: renewForm.endDate,
          rentAmount: parseFloat(renewForm.rentAmount),
          depositAmount: parseFloat(renewForm.depositAmount),
        }),
      });

      if (response.ok) {
        setNotification({
          isOpen: true,
          type: "success",
          title: "Lease Renewed!",
          message: "New lease agreement created successfully.",
        });
        setRenewModal(false);
        window.location.reload();
      } else {
        throw new Error();
      }
    } catch (error) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Renewal Failed",
        message: "Failed to renew lease.",
      });
    }
  };

  const handleEnd = async () => {
    if (!selectedLease) return;

    try {
      const response = await fetch(`/api/leases/${selectedLease.id}/terminate`, {
        method: "POST",
      });

      if (response.ok) {
        setNotification({
          isOpen: true,
          type: "success",
          title: "Lease Terminated!",
          message: "Lease has been terminated successfully.",
        });
        setEndModal(false);
        window.location.reload();
      } else {
        throw new Error();
      }
    } catch (error) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Termination Failed",
        message: "Failed to terminate lease.",
      });
    }
  };

  const handleSendContract = async () => {
    if (!selectedLease) return;

    try {
      const response = await fetch(`/api/leases/${selectedLease.id}/send-contract`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setNotification({
          isOpen: true,
          type: "success",
          title: "Contract Sent!",
          message: `Lease agreement sent to ${selectedLease.tenant.user.email}`,
        });
        window.location.reload();
      } else {
        throw new Error();
      }
    } catch (error) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Send Failed",
        message: "Failed to send contract. Please try again.",
      });
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "PENDING": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "EXPIRED": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "TERMINATED": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "CANCELLED": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-400/20 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-blue-300 text-xs">{propertyFilter ? "Property Leases" : "Total Leases"}</p>
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-green-600/20 to-green-400/20 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-green-300 text-xs">Active</p>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.active}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-400/20 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-yellow-300 text-xs">Pending</p>
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.pending}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-600/20 to-orange-400/20 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-orange-300 text-xs">Expiring Soon</p>
            <Calendar className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.expiring}</p>
        </div>

        <div className="bg-gradient-to-br from-red-600/20 to-red-400/20 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-red-300 text-xs">Terminated</p>
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.terminated}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600/20 to-purple-400/20 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-purple-300 text-xs">Monthly Revenue</p>
            <DollarSign className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">KSH {stats.monthlyRevenue.toLocaleString()}</p>
        </div>
      </div>


      {/* Expiring Leases Alert Widget */}
      <div>
        <ExpiringLeasesAlert leases={filteredLeases} />
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by tenant, unit, property..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500"
            />
          </div>

          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
          >
            <option value="">All Properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending Approval</option>
            <option value="EXPIRED">Expired</option>
            <option value="TERMINATED">Terminated</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <p className="text-gray-400 text-sm mt-3">
          Showing {filteredLeases.length} of {leases.length} leases
          {propertyFilter && ` (${propertyFilteredLeases.length} in selected property)`}
        </p>
      </div>

      {/* Leases Grid */}
      {filteredLeases.length === 0 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
          <p className="text-gray-400">No leases found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeases.map((lease) => {
            const today = new Date();
            const effectiveEndDate = getEffectiveEndDate(lease);
            const daysUntilExpiry = Math.floor((effectiveEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={lease.id}
                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {lease.tenant.user.firstName} {lease.tenant.user.lastName}
                    </h3>
                    <p className="text-sm text-gray-400">{lease.tenant.user.email}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(lease.status)}`}>
                    {lease.status}
                  </span>
                </div>

                {/* Property & Unit */}
                <div className="bg-gray-900/50 rounded-lg p-3 mb-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Property:</span>
                    <span className="text-white font-medium">{lease.unit.property.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Unit:</span>
                    <span className="text-white font-medium">{lease.unit.unitNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Rent:</span>
                    <span className="text-white font-medium">KSH {lease.rentAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Lease Period */}
                <div className="bg-blue-900/20 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400">
                      {lease.status === "TERMINATED" ? "Lease Period (Terminated)" : "Lease Period"}
                    </span>
                    {lease.status === "ACTIVE" && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                      <span className="text-orange-400">Expires in {daysUntilExpiry} days</span>
                    )}
                  </div>
                  <p className="text-white text-sm">
                    {new Date(lease.startDate).toLocaleDateString()} - {effectiveEndDate.toLocaleDateString()}
                  </p>
                  {lease.status === "TERMINATED" && (
                    <p className="text-gray-500 text-xs mt-1 line-through">
                      Original: {new Date(lease.endDate).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openViewModal(lease)}
                    className="border-gray-700 hover:border-blue-500 text-gray-300"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>

                  {lease.status === "ACTIVE" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRenewModal(lease)}
                        className="border-gray-700 hover:border-green-500 text-gray-300"
                      >
                        <RotateCw className="w-4 h-4 mr-2" />
                        Renew
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEndModal(lease)}
                        className="col-span-2 border-gray-700 hover:border-red-500 text-gray-300"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        End Lease
                      </Button>
                    </>
                  )}

                  {lease.status === "PENDING" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(lease)}
                        className="border-gray-700 hover:border-purple-500 text-gray-300"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setSelectedLease(lease);
                          try {
                            const response = await fetch(`/api/leases/${lease.id}/send-contract`, {
                              method: "POST",
                            });
                            if (response.ok) {
                              setNotification({
                                isOpen: true,
                                type: "success",
                                title: "Contract Sent!",
                                message: `Lease agreement sent to ${lease.tenant.user.email}`,
                              });
                              setTimeout(() => window.location.reload(), 1500);
                            } else {
                              throw new Error();
                            }
                          } catch (error) {
                            setNotification({
                              isOpen: true,
                              type: "error",
                              title: "Failed",
                              message: "Failed to send contract. Please try again.",
                            });
                          }
                        }}
                        className="border-gray-700 hover:border-cyan-500 text-gray-300"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Send Contract
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Modal */}
      {viewModal && selectedLease && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Lease Details</h2>
              <button onClick={() => setViewModal(false)} className="text-gray-400 hover:text-white">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Tenant Info */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Tenant Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Name</p>
                    <p className="text-white font-medium">{selectedLease.tenant.user.firstName} {selectedLease.tenant.user.lastName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Email</p>
                    <p className="text-white font-medium">{selectedLease.tenant.user.email}</p>
                  </div>
                </div>
              </div>

              {/* Property Info */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Property & Unit
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Property</p>
                    <p className="text-white font-medium">{selectedLease.unit.property.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Unit</p>
                    <p className="text-white font-medium">{selectedLease.unit.unitNumber}</p>
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Financial Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Monthly Rent</p>
                    <p className="text-white font-medium">KSH {selectedLease.rentAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Deposit</p>
                    <p className="text-white font-medium">KSH {selectedLease.depositAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Lease Period */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Lease Period
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Start Date</p>
                    <p className="text-white font-medium">{new Date(selectedLease.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">
                      {selectedLease.status === "TERMINATED" ? "Terminated Date" : "End Date"}
                    </p>
                    <p className="text-white font-medium">{getEffectiveEndDate(selectedLease).toLocaleDateString()}</p>
                  </div>
                  {selectedLease.status === "TERMINATED" && (
                    <div className="col-span-2">
                      <p className="text-gray-400">Original End Date</p>
                      <p className="text-gray-500 text-sm line-through">{new Date(selectedLease.endDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400">Status</p>
                    <p className={`font-medium ${getStatusColor(selectedLease.status)}`}>{selectedLease.status}</p>
                  </div>
                </div>
              </div>

              {/* Terms */}
              {selectedLease.terms && (
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Terms & Conditions</h3>
                  <p className="text-white text-sm whitespace-pre-wrap">{selectedLease.terms}</p>
                </div>
              )}

              {/* SIGNED CONTRACT DETAILS - Only for ACTIVE leases */}
              {selectedLease.status === "ACTIVE" && selectedLease.contractSignedAt && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    ✅ Contract Signed
                  </h3>
                  <div className="space-y-2 text-sm">
                    {selectedLease.contractSentAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Contract Sent:</span>
                        <span className="text-white">
                          {new Date(selectedLease.contractSentAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Signed On:</span>
                      <span className="text-green-400 font-semibold">
                        {new Date(selectedLease.contractSignedAt).toLocaleString()}
                      </span>
                    </div>
                    {selectedLease.contractSignedBy && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Signed By:</span>
                        <span className="text-white">{selectedLease.contractSignedBy}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FULL CONTRACT TERMS - Only for signed leases */}
              {selectedLease.contractTerms && (
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Full Signed Contract Agreement
                  </h3>
                  <div className="text-xs text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto bg-gray-800/50 p-4 rounded border border-gray-700 font-mono">
                    {selectedLease.contractTerms}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button variant="outline" onClick={() => setViewModal(false)} className="border-gray-700">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && selectedLease && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Edit Lease Terms</h2>
              <button onClick={() => setEditModal(false)} className="text-gray-400 hover:text-white">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Start Date</Label>
                  <Input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">End Date</Label>
                  <Input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Monthly Rent (KSH)</Label>
                  <Input
                    type="number"
                    value={editForm.rentAmount}
                    onChange={(e) => setEditForm({ ...editForm, rentAmount: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Deposit (KSH)</Label>
                  <Input
                    type="number"
                    value={editForm.depositAmount}
                    onChange={(e) => setEditForm({ ...editForm, depositAmount: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300">Additional Terms (Optional)</Label>
                <textarea
                  value={editForm.terms}
                  onChange={(e) => setEditForm({ ...editForm, terms: e.target.value })}
                  rows={3}
                  placeholder="Add any additional terms or conditions..."
                  className="w-full bg-gray-900 border-gray-700 text-white rounded-lg p-3"
                />
              </div>

              {/* FULL CONTRACT PREVIEW */}
              <div>
                <Label className="text-gray-300 flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4" />
                  Full Contract Template (Edit as needed)
                </Label>
                <div className="bg-blue-900/10 border border-blue-500/30 rounded-lg p-3 mb-2">
                  <p className="text-blue-300 text-xs">
                    📝 This is the complete contract that will be sent to the tenant. You can edit it directly below.
                  </p>
                </div>
                <textarea
                  value={editForm.contractTemplate}
                  onChange={(e) => setEditForm({ ...editForm, contractTemplate: e.target.value })}
                  rows={16}
                  className="w-full bg-gray-900 border-gray-700 text-white rounded-lg p-3 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button variant="outline" onClick={() => setEditModal(false)} className="border-gray-700">
                Cancel
              </Button>
              <Button onClick={handleEdit} className="bg-gradient-to-r from-purple-600 to-pink-600">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {renewModal && selectedLease && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Renew Lease</h2>
              <button onClick={() => setRenewModal(false)} className="text-gray-400 hover:text-white">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-blue-300 text-sm">
                This will create a new lease agreement starting from the specified date. The current lease will be marked as expired.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">New Start Date</Label>
                  <Input
                    type="date"
                    value={renewForm.startDate}
                    onChange={(e) => setRenewForm({ ...renewForm, startDate: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">New End Date</Label>
                  <Input
                    type="date"
                    value={renewForm.endDate}
                    onChange={(e) => setRenewForm({ ...renewForm, endDate: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Monthly Rent (KSH)</Label>
                  <Input
                    type="number"
                    value={renewForm.rentAmount}
                    onChange={(e) => setRenewForm({ ...renewForm, rentAmount: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Deposit (KSH)</Label>
                  <Input
                    type="number"
                    value={renewForm.depositAmount}
                    onChange={(e) => setRenewForm({ ...renewForm, depositAmount: e.target.value })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button variant="outline" onClick={() => setRenewModal(false)} className="border-gray-700">
                Cancel
              </Button>
              <Button onClick={handleRenew} className="bg-gradient-to-r from-green-600 to-emerald-600">
                Create New Lease
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={endModal}
        onClose={() => setEndModal(false)}
        onConfirm={handleEnd}
        title="Terminate Lease"
        message={`Are you sure you want to terminate the lease for ${selectedLease?.tenant.user.firstName} ${selectedLease?.tenant.user.lastName}? This will end the lease agreement and mark it as terminated.`}
        confirmText="Terminate Lease"
        type="danger"
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />
    </>
  );
}
