import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, User, Home, DollarSign, FileText, Shield, AlertTriangle } from "lucide-react";
import SwitchUnitButton from "@/components/tenants/switch-unit-button";

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;


export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "MANAGER"]);

  const tenant = await prisma.tenants.findUnique({
    where: { id: params.id },
    include: {
      users: true,
      units: {
        include: {
          properties: true,
        },
      },
      lease_agreements: {
        orderBy: { createdAt: "desc" },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      security_deposits: {
        orderBy: { createdAt: "desc" },
      },
      damage_assessments: {
        orderBy: { createdAt: "desc" },
      },
      vacate_notices: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tenant) notFound();

  // Get current active or pending lease
  const currentLease = tenant.lease_agreements.find((l) => l.status === "ACTIVE" || l.status === "PENDING");
  const leaseStatus = currentLease?.status || "INACTIVE";

  // Calculate payment stats
  const totalPaid = tenant.payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = tenant.payments.filter((p) => p.status === "PENDING");
  const completedPayments = tenant.payments.filter((p) => p.status === "COMPLETED");

  // Get LIVE data from unit (source of truth)
  const liveRent = currentLease?.rentAmount || tenant.units.rentAmount;
  const liveDeposit = currentLease?.depositAmount || tenant.units.depositAmount || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/tenants">
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {tenant.users.firstName} {tenant.users.lastName}
            </h1>
            <p className="text-gray-400">{tenant.users.email}</p>
          </div>
        </div>
        {leaseStatus !== "INACTIVE" && (
          <div className="flex gap-3">
            <SwitchUnitButton
              tenantId={tenant.id}
              currentUnit={{
                unitNumber: tenant.units.unitNumber,
                rentAmount: liveRent,
                depositAmount: liveDeposit,
                properties: {
                  name: tenant.units.properties.name,
                },
              }}
              tenantName={`${tenant.users.firstName} ${tenant.users.lastName}`}
            />
            <Link href={`/dashboard/admin/tenants/${tenant.id}/edit`}>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Edit className="w-4 h-4 mr-2" />
                Edit Tenant
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex gap-3">
        <span
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            leaseStatus === "ACTIVE"
              ? "bg-green-500/10 text-green-400 border border-green-500/30"
              : leaseStatus === "PENDING"
              ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30"
          }`}
        >
          {leaseStatus === "ACTIVE" ? "ACTIVE LEASE" : leaseStatus === "PENDING" ? "PENDING APPROVAL" : "INACTIVE"}
        </span>
        {tenant.vacate_notices.length > 0 && (
          <span className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500/10 text-orange-400 border border-orange-500/30">
            VACATE NOTICE
          </span>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Info */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            Personal Info
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-xs">Full Name</p>
              <p className="text-white font-semibold">{tenant.users.firstName} {tenant.users.lastName}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Email</p>
              <p className="text-white">{tenant.users.email}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Phone</p>
              <p className="text-white">{tenant.users.phoneNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Current Lease Period</p>
              <p className="text-white text-sm">
                {currentLease ? (
                  <>
                    {new Date(currentLease.startDate).toLocaleDateString()} - {new Date(currentLease.endDate).toLocaleDateString()}
                  </>
                ) : (
                  "No active lease"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Unit Info - LIVE DATA FROM UNITS TABLE */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-cyan-400" />
            Unit Info
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-xs">Property</p>
              <p className="text-white font-semibold">{tenant.units.properties.name}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Unit</p>
              <p className="text-white font-semibold text-lg">Unit {tenant.units.unitNumber}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Type</p>
              <p className="text-white">{tenant.units.type.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Monthly Rent</p>
              <p className="text-2xl font-bold text-green-400">
                KSH {liveRent.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {currentLease ? "From active lease" : "From unit"}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Financials
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-xs">Total Paid</p>
              <p className="text-2xl font-bold text-green-400">KSH {totalPaid.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Completed Payments</p>
              <p className="text-white font-semibold">{completedPayments.length}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Pending Payments</p>
              <p className="text-yellow-400 font-semibold">{pendingPayments.length}</p>
            </div>
            {liveDeposit > 0 && (
              <div>
                <p className="text-gray-400 text-xs">Deposit</p>
                <p className="text-white font-semibold">
                  KSH {liveDeposit.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentLease ? "From active lease" : "From unit"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          Payment History
        </h2>
        {tenant.payments.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No payments yet</p>
        ) : (
          <div className="space-y-2">
            {tenant.payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                <div>
                  <p className="text-white font-semibold">KSH {payment.amount.toLocaleString()}</p>
                  <p className="text-gray-400 text-sm">
                    {payment.paymentMethod} • {new Date(payment.paymentDate).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-medium ${
                  payment.status === "COMPLETED" ? "bg-green-500/10 text-green-400" :
                  payment.status === "PENDING" ? "bg-yellow-500/10 text-yellow-400" :
                  "bg-red-500/10 text-red-400"
                }`}>
                  {payment.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lease Agreements */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Lease Agreements
        </h2>
        {tenant.lease_agreements.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No lease agreements</p>
        ) : (
          <div className="space-y-2">
            {tenant.lease_agreements.map((lease) => (
              <div key={lease.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                <div>
                  <p className="text-white font-semibold">
                    {new Date(lease.startDate).toLocaleDateString()} - {new Date(lease.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-gray-400 text-sm">Rent: KSH {lease.rentAmount.toLocaleString()} • Deposit: KSH {lease.depositAmount.toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-medium ${
                  lease.status === "ACTIVE" ? "bg-green-500/10 text-green-400" :
                  lease.status === "PENDING" ? "bg-yellow-500/10 text-yellow-400" :
                  lease.status === "EXPIRED" ? "bg-red-500/10 text-red-400" :
                  "bg-gray-500/10 text-gray-400"
                }`}>
                  {lease.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Deposits */}
      {tenant.security_deposits.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Security Deposits
          </h2>
          <div className="space-y-2">
            {tenant.security_deposits.map((deposit) => (
              <div key={deposit.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                <div>
                  <p className="text-white font-semibold">KSH {deposit.amount.toLocaleString()}</p>
                  <p className="text-gray-400 text-sm">{new Date(deposit.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-medium ${
                  deposit.status === "HELD" ? "bg-blue-500/10 text-blue-400" :
                  deposit.status === "RETURNED" ? "bg-green-500/10 text-green-400" :
                  "bg-red-500/10 text-red-400"
                }`}>
                  {deposit.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Damage Assessments */}
      {tenant.damage_assessments.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            Damage Assessments
          </h2>
          <div className="space-y-2">
            {tenant.damage_assessments.map((assessment) => (
              <div key={assessment.id} className="p-3 bg-gray-900/50 rounded-lg">
                <p className="text-white font-semibold">{assessment.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-gray-400 text-sm">{new Date(assessment.assessmentDate).toLocaleDateString()}</p>
                  <p className="text-orange-400 font-semibold">KSH {assessment.estimatedCost.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
