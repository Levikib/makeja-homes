"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Mail, Phone, User, ArrowLeft, Edit, UserPlus, X, IdCard, Archive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TenantInfo {
  id: string;
  leaseStartDate: Date;
  leaseEndDate: Date;
  rentAmount: number;
  depositAmount: number;
  users: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
    idNumber: string | null;
    isActive: boolean;
  };
}

interface Unit {
  id: string;
  unitNumber: string;
  type: string;
  status: string;
  floor: number | null;
  rentAmount: number;
  depositAmount: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  currentTenant: TenantInfo | null;
  historicalTenants: TenantInfo[];
  properties: {
    id: string;
    name: string;
    deletedAt?: Date | null;
  };
  isArchived?: boolean;
}

export default function UnitDetailsClient({ unit }: { unit: Unit }) {
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(null);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OCCUPIED":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "VACANT":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "MAINTENANCE":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/properties/${unit.properties.id}`}>
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Unit {unit.unitNumber}
              {unit.isArchived && (
                <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-full border border-red-500/30 flex items-center gap-2">
                  <Archive className="w-4 h-4" />
                  Archived
                </span>
              )}
            </h1>
            <p className="text-gray-400">{unit.properties.name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {/* Show buttons only if NOT archived */}
          {!unit.isArchived && (
            <>
              {/* Show Assign Tenant button only for VACANT units */}
              {unit.status === "VACANT" && (
                <Link href={`/dashboard/properties/${unit.properties.id}/units/${unit.id}/assign-tenant`}>
                  <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign Tenant
                  </Button>
                </Link>
              )}
              <Link href={`/dashboard/properties/${unit.properties.id}/units/${unit.id}/edit`}>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Unit
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Archived Warning */}
      {unit.isArchived && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Archive className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-yellow-400 font-semibold">Archived Unit</h3>
              <p className="text-gray-300 text-sm mt-1">
                This unit is archived (read-only). All tenants have been moved to historical data.
                Restore the property to make changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Unit Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-2">Status</p>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(unit.status)}`}>
            {unit.status}
          </span>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-2">Type</p>
          <p className="text-white font-semibold">{unit.type}</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-2">Monthly Rent</p>
          <p className="text-white font-semibold">KSH {unit.rentAmount.toLocaleString()}</p>
        </div>

        {unit.depositAmount && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Security Deposit</p>
            <p className="text-white font-semibold">KSH {unit.depositAmount.toLocaleString()}</p>
          </div>
        )}

        {unit.bedrooms && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Bedrooms</p>
            <p className="text-white font-semibold">{unit.bedrooms}</p>
          </div>
        )}

        {unit.bathrooms && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Bathrooms</p>
            <p className="text-white font-semibold">{unit.bathrooms}</p>
          </div>
        )}

        {unit.squareFeet && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Square Feet</p>
            <p className="text-white font-semibold">{unit.squareFeet.toLocaleString()}</p>
          </div>
        )}

        {unit.floor && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Floor</p>
            <p className="text-white font-semibold">{unit.floor}</p>
          </div>
        )}
      </div>

      {/* Current Tenant */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Current Tenant</h3>
        <div className="space-y-4">
          {unit.currentTenant ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-gray-400 text-xs">Tenant Name</p>
                  <p className="text-white font-semibold">
                    {unit.currentTenant.users.firstName} {unit.currentTenant.users.lastName}
                  </p>
                </div>
              </div>

              {unit.currentTenant.users.idNumber && (
                <div className="flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-gray-400 text-xs">National ID</p>
                    <p className="text-white font-semibold">{unit.currentTenant.users.idNumber}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-gray-400 text-xs">Email</p>
                  <p className="text-white font-semibold">{unit.currentTenant.users.email}</p>
                </div>
              </div>

              {unit.currentTenant.users.phoneNumber && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-gray-400 text-xs">Phone</p>
                    <p className="text-white font-semibold">{unit.currentTenant.users.phoneNumber}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-gray-400 text-xs">Lease Period</p>
                  <p className="text-white font-semibold">
                    {formatDate(unit.currentTenant.leaseStartDate)} - {formatDate(unit.currentTenant.leaseEndDate)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
              <p className="text-gray-400">No current tenant</p>
            </div>
          )}
        </div>
      </div>

      {/* Historical Tenants */}
      {unit.historicalTenants.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Tenant History ({unit.historicalTenants.length})
          </h3>
          <div className="space-y-3">
            {unit.historicalTenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => setSelectedTenant(tenant)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-4 flex items-center justify-between hover:border-purple-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold">
                      {tenant.users.firstName} {tenant.users.lastName}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {formatDate(tenant.leaseStartDate)} - {formatDate(tenant.leaseEndDate)}
                    </p>
                    {!tenant.users.isActive && (
                      <span className="text-xs text-red-400">(Inactive)</span>
                    )}
                  </div>
                </div>
                <div className="text-purple-400 group-hover:text-purple-300 transition-colors">
                  View Details →
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tenant Details Modal */}
      <AnimatePresence>
        {selectedTenant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTenant(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/50 rounded-2xl p-8 max-w-2xl w-full shadow-2xl"
            >
              <button
                onClick={() => setSelectedTenant(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <h2 className="text-2xl font-bold text-purple-400 mb-6">Tenant Details</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">First Name</p>
                    <p className="text-white font-semibold">{selectedTenant.users.firstName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Last Name</p>
                    <p className="text-white font-semibold">{selectedTenant.users.lastName}</p>
                  </div>
                </div>

                {selectedTenant.users.idNumber && (
                  <div>
                    <p className="text-gray-400 text-sm">National ID</p>
                    <p className="text-white font-semibold">{selectedTenant.users.idNumber}</p>
                  </div>
                )}

                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white font-semibold">{selectedTenant.users.email}</p>
                </div>

                {selectedTenant.users.phoneNumber && (
                  <div>
                    <p className="text-gray-400 text-sm">Phone Number</p>
                    <p className="text-white font-semibold">{selectedTenant.users.phoneNumber}</p>
                  </div>
                )}

                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Lease Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Start Date</p>
                      <p className="text-white font-semibold">{formatDate(selectedTenant.leaseStartDate)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">End Date</p>
                      <p className="text-white font-semibold">{formatDate(selectedTenant.leaseEndDate)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Monthly Rent</p>
                      <p className="text-white font-semibold">KSH {selectedTenant.rentAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Security Deposit</p>
                      <p className="text-white font-semibold">KSH {selectedTenant.depositAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

              </div>

              <button
                onClick={() => setSelectedTenant(null)}
                className="mt-6 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold text-white hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
