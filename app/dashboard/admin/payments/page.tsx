import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Droplets, DollarSign, TrendingUp, AlertCircle, CheckCircle, Shield } from "lucide-react";

export default async function PaymentsPage() {
  await requireRole(["ADMIN", "MANAGER"]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
            💰 Payment Management
          </h1>
          <p className="text-gray-400 mt-1">Track rent, water bills, and deposits</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/admin/payments/record">
            <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </Link>
          <Link href="/dashboard/admin/deposits">
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
              <Shield className="w-4 h-4 mr-2" />
              Deposits
            </Button>
          </Link>
          <Link href="/dashboard/admin/water-readings">
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-600">
              <Droplets className="w-4 h-4 mr-2" />
              Water Readings
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Total Collected</h3>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">KSH 0</p>
          <p className="text-xs text-green-400">Collection Rate: 0%</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Pending</h3>
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">KSH 0</p>
          <p className="text-xs text-yellow-400">0 invoices</p>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-pink-600/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Overdue</h3>
            <TrendingUp className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">KSH 0</p>
          <p className="text-xs text-red-400">0 overdue</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-amber-600/10 border border-orange-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Partial Payments</h3>
            <CheckCircle className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">KSH 0</p>
          <p className="text-xs text-orange-400">0 partial</p>
        </div>
      </div>

      {/* Payments Table Placeholder */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
        <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">No payments found</h2>
        <p className="text-gray-400 mb-6">
          Start by recording a payment or water reading
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard/admin/payments/record">
            <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </Link>
          <Link href="/dashboard/admin/water-readings/new">
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-600">
              <Droplets className="w-4 h-4 mr-2" />
              Add Water Reading
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
