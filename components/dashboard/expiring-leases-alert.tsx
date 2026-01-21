"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Clock, CalendarDays, X, Eye } from "lucide-react";

interface Lease {
  id: string;
  status: string;
  startDate: Date;
  endDate: Date;
  rentAmount: number;
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

interface ExpiringLease extends Lease {
  daysRemaining: number;
}

interface ExpiringLeasesAlertProps {
  leases: Lease[];
}

export default function ExpiringLeasesAlert({ leases }: ExpiringLeasesAlertProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"critical" | "warning" | "info" | null>(null);

  // Calculate expiring leases from passed leases prop (reactive to filters!)
  const data = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ninetyDaysFromNow = new Date(today);
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    // Filter only ACTIVE leases expiring within 90 days
    const expiringLeases = leases
      .filter((lease) => {
        if (lease.status !== "ACTIVE") return false;
        const endDate = new Date(lease.endDate);
        return endDate >= today && endDate <= ninetyDaysFromNow;
      })
      .map((lease) => {
        const endDate = new Date(lease.endDate);
        const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...lease, daysRemaining };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Categorize by urgency
    const categorized = {
      critical: expiringLeases.filter((l) => l.daysRemaining <= 30),
      warning: expiringLeases.filter((l) => l.daysRemaining > 30 && l.daysRemaining <= 60),
      info: expiringLeases.filter((l) => l.daysRemaining > 60 && l.daysRemaining <= 90),
    };

    return {
      total: expiringLeases.length,
      categorized,
    };
  }, [leases]);

  const openModal = (type: "critical" | "warning" | "info") => {
    setModalType(type);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
  };

  if (data.total === 0) {
    return (
      <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-green-400" />
          <div>
            <h3 className="text-green-400 font-semibold">All Leases Current</h3>
            <p className="text-gray-400 text-sm">No leases expiring in the next 90 days</p>
          </div>
        </div>
      </div>
    );
  }

  const { critical, warning, info } = data.categorized;

  const getModalData = () => {
    if (modalType === "critical") return { leases: critical, title: "Critical Leases", color: "red" };
    if (modalType === "warning") return { leases: warning, title: "Warning Leases", color: "yellow" };
    if (modalType === "info") return { leases: info, title: "Info Leases", color: "blue" };
    return { leases: [], title: "", color: "" };
  };

  const modalData = getModalData();

  return (
    <>
      {/* Compact 3-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Critical - Red */}
        {critical.length > 0 && (
          <div
            onClick={() => openModal("critical")}
            className="bg-red-900/20 border border-red-500/30 rounded-xl p-5 cursor-pointer hover:border-red-500/60 transition-all hover:shadow-lg hover:shadow-red-500/20"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <div className="flex-1">
                <h3 className="text-red-400 font-bold text-lg">Critical</h3>
                <p className="text-gray-400 text-xs">≤30 days</p>
              </div>
              <span className="text-3xl font-bold text-red-400">{critical.length}</span>
            </div>

            {/* Show first 3 leases */}
            <div className="space-y-2">
              {critical.slice(0, 3).map((lease) => (
                <div
                  key={lease.id}
                  className="bg-gray-900/50 rounded-lg p-2 text-xs border border-gray-700"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-white font-medium truncate">
                        {lease.unit.property.name} - {lease.unit.unitNumber}
                      </p>
                      <p className="text-gray-400 truncate">
                        {lease.tenant.user.firstName} {lease.tenant.user.lastName}
                      </p>
                    </div>
                    <span className="text-red-400 font-bold whitespace-nowrap ml-2">
                      {lease.daysRemaining}d
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* View All button */}
            {critical.length > 3 && (
              <button className="w-full mt-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" />
                View All {critical.length} Leases
              </button>
            )}
          </div>
        )}

        {/* Warning - Yellow */}
        {warning.length > 0 && (
          <div
            onClick={() => openModal("warning")}
            className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-5 cursor-pointer hover:border-yellow-500/60 transition-all hover:shadow-lg hover:shadow-yellow-500/20"
          >
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-yellow-400" />
              <div className="flex-1">
                <h3 className="text-yellow-400 font-bold text-lg">Warning</h3>
                <p className="text-gray-400 text-xs">30-60 days</p>
              </div>
              <span className="text-3xl font-bold text-yellow-400">{warning.length}</span>
            </div>

            {/* Show first 3 leases */}
            <div className="space-y-2">
              {warning.slice(0, 3).map((lease) => (
                <div
                  key={lease.id}
                  className="bg-gray-900/50 rounded-lg p-2 text-xs border border-gray-700"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-white font-medium truncate">
                        {lease.unit.property.name} - {lease.unit.unitNumber}
                      </p>
                      <p className="text-gray-400 truncate">
                        {lease.tenant.user.firstName} {lease.tenant.user.lastName}
                      </p>
                    </div>
                    <span className="text-yellow-400 font-bold whitespace-nowrap ml-2">
                      {lease.daysRemaining}d
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* View All button */}
            {warning.length > 3 && (
              <button className="w-full mt-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm font-medium transition-all flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" />
                View All {warning.length} Leases
              </button>
            )}
          </div>
        )}

        {/* Info - Blue */}
        {info.length > 0 && (
          <div
            onClick={() => openModal("info")}
            className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-5 cursor-pointer hover:border-blue-500/60 transition-all hover:shadow-lg hover:shadow-blue-500/20"
          >
            <div className="flex items-center gap-3 mb-4">
              <CalendarDays className="w-6 h-6 text-blue-400" />
              <div className="flex-1">
                <h3 className="text-blue-400 font-bold text-lg">Info</h3>
                <p className="text-gray-400 text-xs">60-90 days</p>
              </div>
              <span className="text-3xl font-bold text-blue-400">{info.length}</span>
            </div>

            {/* Show first 3 leases */}
            <div className="space-y-2">
              {info.slice(0, 3).map((lease) => (
                <div
                  key={lease.id}
                  className="bg-gray-900/50 rounded-lg p-2 text-xs border border-gray-700"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-white font-medium truncate">
                        {lease.unit.property.name} - {lease.unit.unitNumber}
                      </p>
                      <p className="text-gray-400 truncate">
                        {lease.tenant.user.firstName} {lease.tenant.user.lastName}
                      </p>
                    </div>
                    <span className="text-blue-400 font-bold whitespace-nowrap ml-2">
                      {lease.daysRemaining}d
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* View All button */}
            {info.length > 3 && (
              <button className="w-full mt-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium transition-all flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" />
                View All {info.length} Leases
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && modalType && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-6 border-b border-gray-700 bg-${modalData.color}-900/20`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-2xl font-bold text-${modalData.color}-400`}>
                    {modalData.title}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {modalData.leases.length} lease{modalData.leases.length !== 1 ? "s" : ""} expiring
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="space-y-3">
                {modalData.leases.map((lease) => (
                  <div
                    key={lease.id}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-white font-bold text-lg">
                          {lease.unit.property.name}
                        </h3>
                        <p className="text-gray-400 text-sm">Unit {lease.unit.unitNumber}</p>
                      </div>
                      <span className={`text-${modalData.color}-400 font-bold text-2xl`}>
                        {lease.daysRemaining} days
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Tenant</p>
                        <p className="text-white font-medium">
                          {lease.tenant.user.firstName} {lease.tenant.user.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Email</p>
                        <p className="text-white font-medium">{lease.tenant.user.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Rent Amount</p>
                        <p className="text-white font-medium">
                          KSH {lease.rentAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Expires</p>
                        <p className="text-white font-medium">
                          {new Date(lease.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
              <button
                onClick={closeModal}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
