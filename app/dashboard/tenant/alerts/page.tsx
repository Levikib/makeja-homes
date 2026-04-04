"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, AlertTriangle, CheckCircle, Clock, Wrench, FileText, Loader2, DollarSign } from "lucide-react";

interface Alert {
  id: string;
  type: "overdue_bill" | "upcoming_bill" | "lease_expiry" | "maintenance_update" | "payment_received";
  title: string;
  message: string;
  date: string;
  severity: "info" | "warning" | "danger" | "success";
}

const severityConfig = {
  danger:  { bg: "bg-red-500/10 border-red-500/30",     icon: <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />,    dot: "bg-red-400" },
  warning: { bg: "bg-yellow-500/10 border-yellow-500/30", icon: <Clock className="h-5 w-5 text-yellow-400 shrink-0" />,         dot: "bg-yellow-400" },
  info:    { bg: "bg-blue-500/10 border-blue-500/30",    icon: <Bell className="h-5 w-5 text-blue-400 shrink-0" />,             dot: "bg-blue-400" },
  success: { bg: "bg-green-500/10 border-green-500/30",  icon: <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />,     dot: "bg-green-400" },
};

export default function TenantAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buildAlerts();
  }, []);

  const buildAlerts = async () => {
    const built: Alert[] = [];

    try {
      // 1. Bills — overdue and upcoming
      const billsRes = await fetch("/api/tenant/bills");
      if (billsRes.ok) {
        const { bills } = await billsRes.json();
        const today = new Date();

        for (const bill of bills || []) {
          const due = new Date(bill.dueDate);
          const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const monthLabel = new Date(bill.month).toLocaleString("default", { month: "long", year: "numeric" });

          if (bill.status === "OVERDUE") {
            built.push({
              id: `overdue-${bill.id}`,
              type: "overdue_bill",
              title: "Overdue Bill",
              message: `Your ${monthLabel} bill of KSH ${Number(bill.totalAmount).toLocaleString()} is overdue. Please pay immediately to avoid late fees.`,
              date: bill.dueDate,
              severity: "danger",
            });
          } else if (bill.status === "PENDING" && daysUntilDue <= 7 && daysUntilDue >= 0) {
            built.push({
              id: `due-${bill.id}`,
              type: "upcoming_bill",
              title: `Bill Due in ${daysUntilDue} Day${daysUntilDue === 1 ? "" : "s"}`,
              message: `Your ${monthLabel} bill of KSH ${Number(bill.totalAmount).toLocaleString()} is due on ${due.toLocaleDateString("en-KE", { day: "numeric", month: "long" })}.`,
              date: bill.dueDate,
              severity: daysUntilDue <= 3 ? "warning" : "info",
            });
          } else if (bill.status === "PAID" && bill.paidDate) {
            const paidDaysAgo = Math.floor((today.getTime() - new Date(bill.paidDate).getTime()) / (1000 * 60 * 60 * 24));
            if (paidDaysAgo <= 7) {
              built.push({
                id: `paid-${bill.id}`,
                type: "payment_received",
                title: "Payment Received",
                message: `Your ${monthLabel} payment of KSH ${Number(bill.totalAmount).toLocaleString()} has been recorded.`,
                date: bill.paidDate,
                severity: "success",
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch bills for alerts:", err);
    }

    try {
      // 2. Lease expiry
      const leaseRes = await fetch("/api/tenant/lease");
      if (leaseRes.ok) {
        const { lease } = await leaseRes.json();
        if (lease?.endDate) {
          const today = new Date();
          const end = new Date(lease.endDate);
          const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft > 0 && daysLeft <= 90) {
            built.push({
              id: `lease-expiry`,
              type: "lease_expiry",
              title: `Lease Expires in ${daysLeft} Days`,
              message: `Your lease for Unit ${lease.unitNumber || ''} expires on ${end.toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}. Contact your property manager to discuss renewal.`,
              date: lease.endDate,
              severity: daysLeft <= 30 ? "danger" : daysLeft <= 60 ? "warning" : "info",
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch lease for alerts:", err);
    }

    try {
      // 3. Recent maintenance updates
      const maintRes = await fetch("/api/tenant/maintenance");
      if (maintRes.ok) {
        const { requests } = await maintRes.json();
        const today = new Date();
        for (const req of (requests || []).slice(0, 5)) {
          const updatedDaysAgo = Math.floor((today.getTime() - new Date(req.updatedAt || req.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          if (updatedDaysAgo <= 3 && req.status !== "PENDING") {
            built.push({
              id: `maint-${req.id}`,
              type: "maintenance_update",
              title: `Maintenance Update`,
              message: `"${req.title}" is now ${req.status.replace(/_/g, " ").toLowerCase()}.`,
              date: req.updatedAt || req.createdAt,
              severity: req.status === "COMPLETED" ? "success" : "info",
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch maintenance for alerts:", err);
    }

    // Sort by date descending, then severity (danger first)
    const severityOrder = { danger: 0, warning: 1, info: 2, success: 3 };
    built.sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    setAlerts(built);
    setLoading(false);
  };

  const typeIcon: Record<Alert["type"], React.ReactNode> = {
    overdue_bill:      <DollarSign className="h-4 w-4" />,
    upcoming_bill:     <DollarSign className="h-4 w-4" />,
    lease_expiry:      <FileText className="h-4 w-4" />,
    maintenance_update:<Wrench className="h-4 w-4" />,
    payment_received:  <CheckCircle className="h-4 w-4" />,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Alerts & Notifications</h1>
        <p className="text-gray-400 mt-1">Payment reminders, lease updates, and maintenance status</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      ) : alerts.length === 0 ? (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-white text-lg font-semibold">All clear!</h3>
            <p className="text-gray-400 mt-1 text-center max-w-sm">No pending alerts. Your bills are up to date and your lease is in good standing.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Summary counts */}
          {alerts.filter(a => a.severity === "danger").length > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm font-medium">
                {alerts.filter(a => a.severity === "danger").length} urgent item{alerts.filter(a => a.severity === "danger").length > 1 ? "s" : ""} require your attention
              </p>
            </div>
          )}

          {alerts.map(alert => {
            const config = severityConfig[alert.severity];
            return (
              <div key={alert.id} className={`flex items-start gap-4 p-4 border rounded-lg ${config.bg}`}>
                <div className="mt-0.5">{config.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${alert.severity === "danger" ? "text-red-400" : alert.severity === "warning" ? "text-yellow-400" : alert.severity === "success" ? "text-green-400" : "text-blue-400"}`}>
                      {typeIcon[alert.type]}
                    </span>
                    <h4 className="text-white font-semibold text-sm">{alert.title}</h4>
                  </div>
                  <p className="text-gray-300 text-sm">{alert.message}</p>
                  <p className="text-gray-500 text-xs mt-1.5">
                    {new Date(alert.date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
