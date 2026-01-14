"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, DollarSign, AlertCircle, Calendar, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

interface DashboardData {
  tenant: {
    firstName: string;
    lastName: string;
    email: string;
  };
  property: {
    name: string;
    address: string;
    city: string;
  };
  unit: {
    unitNumber: string;
    status: string;
  };
  lease: {
    startDate: string;
    endDate: string;
    status: string;
    remainingDays: number;
    remainingMonths: number;
  };
  rent: {
    monthlyAmount: number;
    depositAmount: number;
  };
  payments: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    totalPaid: number;
    totalPending: number;
    latest: {
      amount: number;
      status: string;
      dueDate: string;
      paidDate: string | null;
    } | null;
  };
  maintenance: {
    total: number;
    pending: number;
  };
}

export default function TenantDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard/tenant");
      
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-200">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md bg-gray-900 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400">Error</CardTitle>
            <CardDescription className="text-gray-300">{error || "Failed to load dashboard"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
      month: "long",
      day: "numeric",
    });
  };

  const getLeaseStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "text-green-400";
      case "Expiring Soon":
        return "text-yellow-400";
      case "Expired":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "text-green-400";
      case "PENDING":
        return "text-yellow-400";
      case "OVERDUE":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white drop-shadow-lg">
          Welcome back, {data.tenant.firstName}! 👋
        </h1>
        <p className="text-gray-300 mt-2 text-lg">
          {data.property.name}, Unit {data.unit.unitNumber}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Current Rent */}
        <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30 hover:border-purple-500/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Monthly Rent</CardTitle>
            <DollarSign className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {formatCurrency(data.rent.monthlyAmount)}
            </div>
            <p className="text-xs text-gray-300 mt-1">
              Deposit: {formatCurrency(data.rent.depositAmount)}
            </p>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card className={`border-2 transition-all ${
          data.payments.overdue > 0 
            ? "bg-gradient-to-br from-red-900/40 to-orange-900/40 border-red-500/30" 
            : "bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-500/30"
        }`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Payment Status</CardTitle>
            {data.payments.overdue > 0 ? (
              <XCircle className="h-5 w-5 text-red-400" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              data.payments.overdue > 0 
                ? "text-red-400" 
                : data.payments.pending > 0 
                ? "text-yellow-400" 
                : "text-green-400"
            }`}>
              {data.payments.overdue > 0 
                ? "Overdue" 
                : data.payments.pending > 0 
                ? "Pending" 
                : "Paid"}
            </div>
            <p className="text-xs text-gray-300 mt-1">
              {data.payments.paid} paid, {data.payments.pending} pending
            </p>
          </CardContent>
        </Card>

        {/* Lease Expiry */}
        <Card className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-blue-500/30 hover:border-blue-500/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Lease Expiry</CardTitle>
            <Calendar className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getLeaseStatusColor(data.lease.status)}`}>
              {data.lease.remainingMonths > 0 
                ? `${data.lease.remainingMonths} month${data.lease.remainingMonths > 1 ? 's' : ''}`
                : `${data.lease.remainingDays} day${data.lease.remainingDays > 1 ? 's' : ''}`
              }
            </div>
            <p className="text-xs text-gray-300 mt-1">
              Until {formatDate(data.lease.endDate)}
            </p>
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card className="bg-gradient-to-br from-orange-900/40 to-yellow-900/40 border-orange-500/30 hover:border-orange-500/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Maintenance</CardTitle>
            <AlertCircle className="h-5 w-5 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{data.maintenance.pending}</div>
            <p className="text-xs text-gray-300 mt-1">
              Pending requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Lease Information */}
        <Card className="bg-gray-900/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white">Lease Information</CardTitle>
            <CardDescription className="text-gray-300">Your tenancy details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-300">Property:</span>
              <span className="text-sm font-medium text-white">{data.property.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-300">Unit:</span>
              <span className="text-sm font-medium text-white">{data.unit.unitNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-300">Lease Start:</span>
              <span className="text-sm font-medium text-white">{formatDate(data.lease.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-300">Lease End:</span>
              <span className="text-sm font-medium text-white">{formatDate(data.lease.endDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-300">Status:</span>
              <span className={`text-sm font-medium ${getLeaseStatusColor(data.lease.status)}`}>
                {data.lease.status}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card className="bg-gray-900/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white">Payment Summary</CardTitle>
            <CardDescription className="text-gray-300">Your payment history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-300">Total Paid:</span>
              <span className="text-sm font-medium text-green-400">
                {formatCurrency(data.payments.totalPaid)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-300">Total Pending:</span>
              <span className="text-sm font-medium text-yellow-400">
                {formatCurrency(data.payments.totalPending)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-300">Total Payments:</span>
              <span className="text-sm font-medium text-white">{data.payments.total}</span>
            </div>
            {data.payments.latest && (
              <>
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-sm font-medium mb-2 text-white">Latest Payment</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Amount:</span>
                    <span className={getPaymentStatusColor(data.payments.latest.status)}>
                      {formatCurrency(data.payments.latest.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-300">Status:</span>
                    <span className={getPaymentStatusColor(data.payments.latest.status)}>
                      {data.payments.latest.status}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - REMOVED "Make Payment" */}
      <Card className="bg-gray-900/50 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
          <CardDescription className="text-gray-300">Common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/dashboard/tenant/maintenance"
              className="p-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl hover:shadow-2xl hover:scale-105 transition-all text-center group"
            >
              <AlertCircle className="h-8 w-8 mb-3 mx-auto group-hover:scale-110 transition-transform" />
              <span className="text-base font-semibold text-white">Request Maintenance</span>
            </Link>
            <Link
              href="/dashboard/tenant/lease"
              className="p-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl hover:shadow-2xl hover:scale-105 transition-all text-center group"
            >
              <Home className="h-8 w-8 mb-3 mx-auto group-hover:scale-110 transition-transform" />
              <span className="text-base font-semibold text-white">View Lease</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}