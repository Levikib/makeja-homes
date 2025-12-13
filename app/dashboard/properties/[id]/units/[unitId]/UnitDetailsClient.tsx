"use client";
import { Calendar, Mail, Phone, User, ArrowLeft, Edit, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
  };
}

export default function UnitDetailsClient({ unit }: { unit: Unit }) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/properties/${unit.properties.id}`}>
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Property
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">
              Unit {unit.unitNumber}
            </h1>
            <p className="text-gray-400">{unit.properties.name}</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Show Assign Tenant button only for VACANT units */}
          {unit.status === "VACANT" && (
            <Link href={`/dashboard/admin/tenants/new?unitId=${unit.id}&propertyId=${unit.properties.id}&unitNumber=${unit.unitNumber}&rentAmount=${unit.rentAmount}&depositAmount=${unit.depositAmount || unit.rentAmount}`}>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
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
        </div>
      </div>

      {/* Main Grid - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Basic Details */}
        <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-700/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-purple-400 mb-4">Basic Details</h3>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-xs">Unit Number</p>
              <p className="text-2xl font-bold text-white">{unit.unitNumber}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Type</p>
              <p className="text-white font-semibold">{unit.type.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Status</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  unit.status === "VACANT"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : unit.status === "OCCUPIED"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                }`}
              >
                {unit.status}
              </span>
            </div>
            {unit.floor && (
              <div>
                <p className="text-gray-400 text-xs">Floor</p>
                <p className="text-white">{unit.floor}</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial */}
        <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-green-400 mb-4">Financial</h3>
          <div className="space-y-4">
            <div className="bg-green-500/10 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Monthly Rent</p>
              <p className="text-2xl font-bold text-green-400">
                KSH {unit.rentAmount.toLocaleString()}
              </p>
            </div>
            {unit.depositAmount && (
              <div className="bg-teal-500/10 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Deposit Amount</p>
                <p className="text-xl font-bold text-teal-400">
                  KSH {unit.depositAmount.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Unit Features */}
        <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-700/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-4">Unit Features</h3>
          <div className="space-y-3">
            {unit.bedrooms !== null && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-400 text-xl">🛏️</span>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Bedrooms</p>
                  <p className="text-white font-semibold">{unit.bedrooms}</p>
                </div>
              </div>
            )}
            {unit.bathrooms !== null && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-cyan-400 text-xl">🚿</span>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Bathrooms</p>
                  <p className="text-white font-semibold">{unit.bathrooms}</p>
                </div>
              </div>
            )}
            {unit.squareFeet && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-400 text-xl">📐</span>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Square Feet</p>
                  <p className="text-white font-semibold">{unit.squareFeet} sq ft</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Current Occupancy */}
        <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-700/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4">Current Occupancy</h3>
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
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-gray-400 text-xs">Email</p>
                  <p className="text-gray-300 text-sm">{unit.currentTenant.users.email}</p>
                </div>
              </div>
              {unit.currentTenant.users.phoneNumber && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-gray-400 text-xs">Phone</p>
                    <p className="text-gray-300 text-sm">{unit.currentTenant.users.phoneNumber}</p>
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-green-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <p className="text-gray-400 text-xs">Lease Period</p>
                </div>
                <p className="text-sm text-gray-300">
                  {formatDate(unit.currentTenant.leaseStartDate)} → {formatDate(unit.currentTenant.leaseEndDate)}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-400 font-semibold">No tenant assigned</p>
              <p className="text-gray-400 text-sm mt-1">Unit is currently {unit.status.toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tenant History Section - Full Width */}
      {unit.historicalTenants && unit.historicalTenants.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900/40 to-zinc-900/40 border border-slate-700/30 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Tenant History
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unit.historicalTenants.map((tenant) => (
              <div
                key={tenant.id}
                className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-red-400" />
                  <p className="text-white font-semibold">
                    {tenant.users.firstName} {tenant.users.lastName}
                  </p>
                </div>
                <div className="text-sm text-gray-400">
                  <p>{tenant.users.email}</p>
                  {tenant.users.phoneNumber && <p>{tenant.users.phoneNumber}</p>}
                </div>
                <div className="pt-2 border-t border-red-500/20">
                  <p className="text-xs text-gray-500">Lease Period:</p>
                  <p className="text-sm text-gray-300">
                    {formatDate(tenant.leaseStartDate)} → {formatDate(tenant.leaseEndDate)}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Rent</p>
                      <p className="text-gray-300 font-semibold">KSH {tenant.rentAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Deposit</p>
                      <p className="text-gray-300 font-semibold">KSH {tenant.depositAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
