"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet, Trash2, Home, Calendar, TrendingUp, AlertCircle } from "lucide-react";

interface BillData {
  tenant: {
    unitNumber: string;
    propertyName: string;
  };
  currentBill: {
    month: string;
    rent: number;
    water: number;
    garbage: number;
    total: number;
    status: string;
    dueDate: string;
    paidDate: string | null;
  };
  waterDetails: {
    previousReading: number;
    currentReading: number;
    unitsConsumed: number;
    ratePerUnit: number;
    amount: number;
    readingDate: string;
  } | null;
  garbageDetails: {
    amount: number;
    isApplicable: boolean;
  } | null;
  billHistory: Array<{
    id: string;
    month: string;
    rent: number;
    water: number;
    garbage: number;
    total: number;
    status: string;
    dueDate: string;
    paidDate: string | null;
  }>;
}

export default function MyUnitPage() {
  const [data, setData] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBillData();
  }, []);

  const fetchBillData = async () => {
    try {
      const response = await fetch("/api/tenant/bills");

      if (!response.ok) {
        throw new Error("Failed to fetch bill data");
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      month: "long",
      day: "numeric",
    });
  };

  const formatMonth = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "text-green-500 bg-green-500/10";
      case "PENDING":
        return "text-yellow-500 bg-yellow-500/10";
      case "OVERDUE":
        return "text-red-500 bg-red-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading bills...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>{error || "Failed to load bills"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">My Unit</h1>
        <p className="text-gray-400 mt-2">
          {data.tenant.propertyName}, Unit {data.tenant.unitNumber}
        </p>
      </div>

      {/* Current Month Bill */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Month Bill</CardTitle>
              <CardDescription>
                {formatMonth(data.currentBill.month)}
              </CardDescription>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                data.currentBill.status
              )}`}
            >
              {data.currentBill.status}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Total Amount */}
            <div className="text-center p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
              <p className="text-gray-400 text-sm mb-2">Total Amount Due</p>
              <p className="text-4xl font-bold text-white">
                {formatCurrency(data.currentBill.total)}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Due: {formatDate(data.currentBill.dueDate)}
              </p>
            </div>

            {/* Bill Breakdown */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Rent */}
              <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <Home className="h-5 w-5 text-purple-500" />
                  <span className="text-gray-400 text-sm">Rent</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(data.currentBill.rent)}
                </p>
              </div>

              {/* Water */}
              <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <Droplet className="h-5 w-5 text-blue-500" />
                  <span className="text-gray-400 text-sm">Water</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(data.currentBill.water)}
                </p>
                {data.waterDetails && (
                  <p className="text-xs text-gray-500 mt-1">
                    {data.waterDetails.unitsConsumed} units @ {formatCurrency(data.waterDetails.ratePerUnit)}/unit
                  </p>
                )}
              </div>

              {/* Garbage */}
              <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <Trash2 className="h-5 w-5 text-green-500" />
                  <span className="text-gray-400 text-sm">Garbage</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(data.currentBill.garbage)}
                </p>
                {data.garbageDetails && !data.garbageDetails.isApplicable && (
                  <p className="text-xs text-gray-500 mt-1">Not applicable</p>
                )}
              </div>
            </div>

            {/* Water Usage Details */}
            {data.waterDetails && (
              <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
                <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Droplet className="h-4 w-4 text-blue-500" />
                  Water Usage Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Previous Reading</p>
                    <p className="text-white font-medium">{data.waterDetails.previousReading}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Current Reading</p>
                    <p className="text-white font-medium">{data.waterDetails.currentReading}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Units Consumed</p>
                    <p className="text-white font-medium">{data.waterDetails.unitsConsumed}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Reading Date</p>
                    <p className="text-white font-medium">
                      {new Date(data.waterDetails.readingDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pay Button */}
            {data.currentBill.status === "PENDING" && (
              <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition">
                Pay {formatCurrency(data.currentBill.total)}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bill History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Past 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">
                    Month
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">
                    Rent
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">
                    Water
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">
                    Garbage
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">
                    Total
                  </th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.billHistory.map((bill) => (
                  <tr key={bill.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                    <td className="py-3 px-4 text-white">
                      {formatMonth(bill.month)}
                    </td>
                    <td className="py-3 px-4 text-right text-white">
                      {formatCurrency(bill.rent)}
                    </td>
                    <td className="py-3 px-4 text-right text-white">
                      {formatCurrency(bill.water)}
                    </td>
                    <td className="py-3 px-4 text-right text-white">
                      {formatCurrency(bill.garbage)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-white">
                      {formatCurrency(bill.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          bill.status
                        )}`}
                      >
                        {bill.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.billHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No billing history yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}