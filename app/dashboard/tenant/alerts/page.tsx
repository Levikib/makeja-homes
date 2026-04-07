"use client";

import { useEffect, useState } from "react";
import { Bell, AlertTriangle, CheckCircle, Clock, Wrench, FileText, Loader2, DollarSign, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Alert {
  id: string;
  type: "overdue_bill" | "upcoming_bill" | "lease_expiry" | "maintenance_update" | "payment_received" | "deposit_outstanding";
  title: string;
  message: string;
  date: string;
  severity: "info" | "warning" | "danger" | "success";
  actionLabel?: string;
  actionHref?: string;
}

const severityConfig = {
  danger:  { bg: "bg-red-500/10 border-red-500/30",      icon: <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" /> },
  warning: { bg: "bg-yellow-500/10 border-yellow-500/30", icon: <Clock className="h-5 w-5 text-yellow-400 shrink-0" /> },
  info:    { bg: "bg-blue-500/10 border-blue-500/30",     icon: <Bell className="h-5 w-5 text-blue-400 shrink-0" /> },
  success: { bg: "bg-green-500/10 border-green-500/30",   icon: <CheckCircle className="h-5 w-5 text-green-400 shrink-0" /> },
};

const typeIcon: Record<Alert["type"], React.ReactNode> = {
  overdue_bill:        <DollarSign className="h-4 w-4" />,
  upcoming_bill:       <DollarSign className="h-4 w-4" />,
  deposit_outstanding: <DollarSign className="h-4 w-4" />,
  lease_expiry:        <FileText className="h-4 w-4" />,
  maintenance_update:  <Wrench className="h-4 w-4" />,
  payment_received:    <CheckCircle className="h-4 w-4" />,
};

export default function TenantAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { buildAlerts(); }, []);

  const buildAlerts = async () => {
    const built: Alert[] = [];
    const today = new Date();

    // Bills + deposit
    try {
      const res = await fetch("/api/tenant/bills");
      if (res.ok) {
        const { bills, deposit } = await res.json();

        // Deposit outstanding
        if (deposit?.outstanding) {
          built.push({
            id: "deposit",
            type: "deposit_outstanding",
            title: "Security Deposit Outstanding",
            message: `Your security deposit of KES ${Math.round(deposit.amount).toLocaleString()} has not been received. Please arrange payment with your property manager as soon as possible.`,
            date: today.toISOString(),
            severity: "danger",
            actionLabel: "Go to Payments",
            actionHref: "/dashboard/tenant/payments",
          });
        }

        for (const bill of bills || []) {
          const due = new Date(bill.dueDate);
          const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const monthLabel = new Date(bill.month).toLocaleString("default", { month: "long", year: "numeric" });
          const balance = bill.balance ?? bill.totalAmount ?? bill.total ?? 0;

          if (bill.status === "OVERDUE") {
            built.push({
              id: `overdue-${bill.id}`,
              type: "overdue_bill",
              title: "Overdue Bill",
              message: `Your ${monthLabel} bill${bill.isPartial ? ` has an outstanding balance` : ""} of KES ${Math.round(balance).toLocaleString()} is overdue. Pay immediately to avoid penalties.`,
              date: bill.dueDate,
              severity: "danger",
              actionLabel: "Pay Now",
              actionHref: "/dashboard/tenant/payments",
            });
          } else if (bill.isPartial) {
            built.push({
              id: `partial-${bill.id}`,
              type: "upcoming_bill",
              title: "Partial Payment — Balance Due",
              message: `${monthLabel}: KES ${Math.round(bill.amountPaid).toLocaleString()} paid, KES ${Math.round(balance).toLocaleString()} still outstanding.`,
              date: bill.dueDate,
              severity: "warning",
              actionLabel: "Pay Balance",
              actionHref: "/dashboard/tenant/payments",
            });
          } else if (bill.status === "PENDING" && daysUntilDue <= 7 && daysUntilDue >= 0) {
            built.push({
              id: `due-${bill.id}`,
              type: "upcoming_bill",
              title: `Bill Due in ${daysUntilDue} Day${daysUntilDue === 1 ? "" : "s"}`,
              message: `Your ${monthLabel} bill of KES ${Math.round(balance).toLocaleString()} is due on ${due.toLocaleDateString("en-KE", { day: "numeric", month: "long" })}.`,
              date: bill.dueDate,
              severity: daysUntilDue <= 3 ? "warning" : "info",
              actionLabel: "Pay Now",
              actionHref: "/dashboard/tenant/payments",
            });
          } else if (bill.status === "PAID" && bill.paidDate) {
            const paidDaysAgo = Math.floor((today.getTime() - new Date(bill.paidDate).getTime()) / (1000 * 60 * 60 * 24));
            if (paidDaysAgo <= 7) {
              built.push({
                id: `paid-${bill.id}`,
                type: "payment_received",
                title: "Payment Confirmed",
                message: `Your ${monthLabel} payment of KES ${Math.round(bill.totalAmount || bill.total || 0).toLocaleString()} has been recorded.`,
                date: bill.paidDate,
                severity: "success",
              });
            }
          }
        }
      }
    } catch {}

    // Lease expiry
    try {
      const res = await fetch("/api/tenant/lease");
      if (res.ok) {
        const lease = await res.json();
        if (lease?.endDate && !lease.error) {
          const end = new Date(lease.endDate);
          const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft > 0 && daysLeft <= 90) {
            built.push({
              id: "lease-expiry",
              type: "lease_expiry",
              title: `Lease Expires in ${daysLeft} Day${daysLeft === 1 ? "" : "s"}`,
              message: `Your lease expires on ${end.toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}. Contact your property manager to discuss renewal.`,
              date: lease.endDate,
              severity: daysLeft <= 30 ? "danger" : daysLeft <= 60 ? "warning" : "info",
              actionLabel: "View Lease",
              actionHref: "/dashboard/tenant/lease",
            });
          }
        }
      }
    } catch {}

    // Recent maintenance updates
    try {
      const res = await fetch("/api/tenant/maintenance");
      if (res.ok) {
        const { requests } = await res.json();
        for (const req of (requests || []).slice(0, 5)) {
          const updatedAt = new Date(req.updatedAt || req.createdAt);
          const daysAgo = Math.floor((today.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
          if (daysAgo <= 3 && req.status !== "PENDING") {
            built.push({
              id: `maint-${req.id}`,
              type: "maintenance_update",
              title: "Maintenance Update",
              message: `"${req.title}" is now ${req.status.replace(/_/g, " ").toLowerCase()}.${req.completionNotes ? ` Notes: ${req.completionNotes}` : ""}`,
              date: req.updatedAt || req.createdAt,
              severity: req.status === "COMPLETED" ? "success" : "info",
              actionLabel: "View Requests",
              actionHref: "/dashboard/tenant/maintenance",
            });
          }
        }
      }
    } catch {}

    // Sort: danger first, then by date
    const order = { danger: 0, warning: 1, info: 2, success: 3 };
    built.sort((a, b) => {
      const diff = order[a.severity] - order[b.severity];
      return diff !== 0 ? diff : new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    setAlerts(built);
    setLoading(false);
  };

  const dangerCount = alerts.filter(a => a.severity === "danger").length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Alerts & Notifications</h1>
        <p className="text-gray-400 text-sm mt-0.5">Payment reminders, lease updates, and maintenance status</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="h-14 w-14 text-green-500 mb-4" />
          <h3 className="text-white text-lg font-semibold">All clear!</h3>
          <p className="text-gray-400 mt-1 text-sm max-w-sm">No pending alerts. Your bills are up to date and your lease is in good standing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dangerCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm font-medium">
                {dangerCount} urgent item{dangerCount > 1 ? "s" : ""} require{dangerCount === 1 ? "s" : ""} your immediate attention
              </p>
            </div>
          )}

          {alerts.map(alert => {
            const config = severityConfig[alert.severity];
            return (
              <div key={alert.id} className={`flex items-start gap-4 p-4 border rounded-xl ${config.bg}`}>
                <div className="mt-0.5 shrink-0">{config.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-gray-500">{typeIcon[alert.type]}</span>
                    <h4 className="text-white font-semibold text-sm">{alert.title}</h4>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{alert.message}</p>
                  <p className="text-gray-500 text-xs mt-1.5">
                    {new Date(alert.date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  {alert.actionLabel && alert.actionHref && (
                    <Link
                      href={alert.actionHref}
                      className={`inline-flex items-center gap-1.5 mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                        alert.severity === "danger"
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : alert.severity === "warning"
                          ? "bg-yellow-500 text-black hover:bg-yellow-400"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      {alert.actionLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
