import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, FileText, Download, RotateCcw } from "lucide-react";

export default async function LeaseDetailPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "MANAGER"]);

  const lease = await prisma.lease_agreements.findUnique({
    where: { id: params.id },
    include: {
      tenants: {
        include: {
          users: true,
          units: {
            include: {
              properties: true,
            },
          },
        },
      },
    },
  });

  if (!lease) notFound();

  const daysRemaining = Math.floor(
    (new Date(lease.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  const leaseDuration = Math.floor(
    (new Date(lease.endDate).getTime() - new Date(lease.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/leases">
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Lease Agreement</h1>
            <p className="text-gray-400">
              {lease.tenants.users.firstName} {lease.tenants.users.lastName}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {lease.status === "ACTIVE" && daysRemaining <= 60 && (
            <Link href={`/dashboard/admin/leases/${lease.id}/renew`}>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
                <RotateCcw className="w-4 h-4 mr-2" />
                Renew Lease
              </Button>
            </Link>
          )}
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          {lease.status === "ACTIVE" && (
            <Link href={`/dashboard/admin/leases/${lease.id}/edit`}>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600">
                <Edit className="w-4 h-4 mr-2" />
                Edit Lease
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex gap-3">
        <span
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            lease.status === "ACTIVE"
              ? "bg-green-500/10 text-green-400 border border-green-500/30"
              : lease.status === "EXPIRED"
              ? "bg-red-500/10 text-red-400 border border-red-500/30"
              : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
          }`}
        >
          {lease.status}
        </span>
        {lease.status === "ACTIVE" && daysRemaining <= 30 && daysRemaining > 0 && (
          <span className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500/10 text-orange-400 border border-orange-500/30">
            Expiring in {daysRemaining} days
          </span>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant Info */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Tenant Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-xs">Name</p>
              <p className="text-white font-semibold">
                {lease.tenants.users.firstName} {lease.tenants.users.lastName}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Email</p>
              <p className="text-white">{lease.tenants.users.email}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Phone</p>
              <p className="text-white">{lease.tenants.users.phoneNumber}</p>
            </div>
          </div>
        </div>

        {/* Property Info */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Property Details</h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-xs">Property</p>
              <p className="text-white font-semibold">{lease.tenants.units.properties.name}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Unit</p>
              <p className="text-white font-semibold text-lg">Unit {lease.tenants.units.unitNumber}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Location</p>
              <p className="text-white">{lease.tenants.units.properties.location}</p>
            </div>
          </div>
        </div>

        {/* Lease Duration */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Lease Duration</h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-xs">Start Date</p>
              <p className="text-white font-semibold">{new Date(lease.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">End Date</p>
              <p className="text-white font-semibold">{new Date(lease.endDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Duration</p>
              <p className="text-white">{Math.floor(leaseDuration / 30)} months ({leaseDuration} days)</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Days Remaining</p>
              <p className={daysRemaining > 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                {daysRemaining > 0 ? `${daysRemaining} days` : `Expired ${Math.abs(daysRemaining)} days ago`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Terms */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Financial Terms</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-gray-400 text-xs">Monthly Rent</p>
            <p className="text-2xl font-bold text-green-400">KSH {lease.monthlyRent.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Security Deposit</p>
            <p className="text-xl font-bold text-blue-400">KSH {lease.securityDeposit.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Payment Due Day</p>
            <p className="text-white font-semibold">{lease.paymentDueDay} of each month</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Late Fee Grace</p>
            <p className="text-white font-semibold">{lease.lateFeeGraceDays} days</p>
          </div>
          {lease.lateFeeAmount && (
            <div>
              <p className="text-gray-400 text-xs">Late Fee Amount</p>
              <p className="text-orange-400 font-semibold">KSH {lease.lateFeeAmount.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Terms & Conditions */}
      {lease.terms && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Terms & Conditions</h2>
          <p className="text-gray-300 whitespace-pre-wrap">{lease.terms}</p>
        </div>
      )}
    </div>
  );
}
