"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Phone, Mail, MessageSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function OverduePaymentsPage() {
  const [overduePayments, setOverduePayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverduePayments();
  }, []);

  const fetchOverduePayments = async () => {
    try {
      const response = await fetch("/api/payments?status=PENDING");
      if (response.ok) {
        const data = await response.json();
        
        // Filter for truly overdue (past due date)
        const now = new Date();
        const overdue = data.filter((payment: any) => {
          const dueDate = payment.periodEnd ? new Date(payment.periodEnd) : new Date(payment.paymentDate);
          return dueDate < now && payment.status === "PENDING";
        });
        
        setOverduePayments(overdue);
      }
    } catch (error) {
      console.error("Error fetching overdue payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysOverdue = (payment: any) => {
    const dueDate = payment.periodEnd ? new Date(payment.periodEnd) : new Date(payment.paymentDate);
    const now = new Date();
    const diffTime = now.getTime() - dueDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/payments">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payments
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-600 bg-clip-text text-transparent">
            ⚠️ Overdue Payments
          </h1>
          <p className="text-gray-400 mt-1">Payments past their due date</p>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">
              {overduePayments.length} Overdue Payments
            </h2>
            <p className="text-gray-400">
              Total Outstanding: <span className="text-red-400 font-bold text-xl">KSH {totalOverdue.toLocaleString()}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="bg-red-600 hover:bg-red-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Bulk SMS
            </Button>
            <Button variant="outline" className="border-red-500 text-red-400">
              <Mail className="w-4 h-4 mr-2" />
              Send Emails
            </Button>
          </div>
        </div>
      </div>

      {/* Overdue List */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading overdue payments...</div>
        ) : overduePayments.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Overdue Payments!</h3>
            <p className="text-gray-400">All tenants are up to date with their payments.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {overduePayments.map((payment: any) => {
              const daysOverdue = calculateDaysOverdue(payment);
              const severity = daysOverdue > 30 ? "critical" : daysOverdue > 14 ? "high" : "medium";
              
              return (
                <div 
                  key={payment.id} 
                  className={`p-6 hover:bg-gray-800/30 ${
                    severity === "critical" ? "border-l-4 border-red-600" :
                    severity === "high" ? "border-l-4 border-orange-600" :
                    "border-l-4 border-yellow-600"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {payment.tenants?.users?.firstName} {payment.tenants?.users?.lastName}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          severity === "critical" ? "bg-red-500/20 text-red-400 border border-red-500/40" :
                          severity === "high" ? "bg-orange-500/20 text-orange-400 border border-orange-500/40" :
                          "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                        }`}>
                          {daysOverdue} days overdue
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-gray-400">Property</p>
                          <p className="text-white">{payment.units?.properties?.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Unit</p>
                          <p className="text-white">{payment.units?.unitNumber}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Payment Type</p>
                          <p className="text-white">{payment.paymentType}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Amount Due</p>
                          <p className="text-red-400 font-bold">KSH {payment.amount.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Phone className="w-4 h-4" />
                          {payment.tenants?.users?.phoneNumber}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Mail className="w-4 h-4" />
                          {payment.tenants?.users?.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-green-500 text-green-400">
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                      <Button size="sm" variant="outline" className="border-blue-500 text-blue-400">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        SMS
                      </Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        Record Payment
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
