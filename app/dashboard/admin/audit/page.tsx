import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { Shield, User, DollarSign, Home, ArrowRightLeft, FileText, Wrench, ChevronRight } from "lucide-react";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ACTION_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  UNIT_TRANSFER:     { label: "Unit Transfer",       color: "text-orange-400",  icon: ArrowRightLeft },
  TENANT_CREATED:    { label: "Tenant Created",       color: "text-green-400",   icon: User },
  PAYMENT_RECORDED:  { label: "Payment Recorded",     color: "text-blue-400",    icon: DollarSign },
  PAYMENT_APPROVED:  { label: "Payment Approved",     color: "text-green-400",   icon: DollarSign },
  PAYMENT_DECLINED:  { label: "Payment Declined",     color: "text-red-400",     icon: DollarSign },
  MAINTENANCE_UPDATE:{ label: "Maintenance Update",   color: "text-purple-400",  icon: Wrench },
  LEASE_SIGNED:      { label: "Lease Signed",         color: "text-cyan-400",    icon: FileText },
};

function formatDetails(action: string, raw: string): string {
  try {
    const d = JSON.parse(raw);
    switch (action) {
      case "UNIT_TRANSFER":
        return `${d.fromProperty} Unit ${d.fromUnit} → ${d.toProperty} Unit ${d.toUnit} | Rent: KSH ${Number(d.oldRent).toLocaleString()} → ${Number(d.newRent).toLocaleString()}`;
      case "TENANT_CREATED":
        return `${d.tenantName} (${d.email}) — ${d.propertyName} Unit ${d.unitNumber} @ KSH ${Number(d.rentAmount).toLocaleString()}/mo`;
      case "PAYMENT_RECORDED":
        return `KSH ${Number(d.amount).toLocaleString()} via ${d.paymentMethod} | Ref: ${d.referenceNumber}`;
      case "PAYMENT_APPROVED":
      case "PAYMENT_DECLINED":
        return `KSH ${Number(d.amount).toLocaleString()}${d.verificationNotes ? ` — ${d.verificationNotes}` : ""}`;
      case "MAINTENANCE_UPDATE":
        return d.status ? `Status → ${d.status}` : JSON.stringify(d);
      default:
        return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(" | ");
    }
  } catch {
    return raw;
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

export default async function AuditLogPage({ searchParams }: { searchParams: { page?: string; action?: string } }) {
  await requireRole(["ADMIN", "MANAGER"]);

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const pageSize = 50;
  const skip = (page - 1) * pageSize;
  const actionFilter = searchParams.action;

  const where = actionFilter ? { action: actionFilter } : {};

  const [logs, total] = await Promise.all([
    prisma.activity_logs.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        users: { select: { firstName: true, lastName: true, email: true, role: true } },
      },
    }),
    prisma.activity_logs.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const allActions = Object.keys(ACTION_META);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            Audit Log
          </h1>
          <p className="text-gray-400 text-sm mt-1">{total.toLocaleString()} total events</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <a
          href="/dashboard/admin/audit"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !actionFilter ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          All
        </a>
        {allActions.map(a => {
          const meta = ACTION_META[a];
          return (
            <a
              key={a}
              href={`/dashboard/admin/audit?action=${a}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                actionFilter === a ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {meta.label}
            </a>
          );
        })}
      </div>

      {/* Log table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="w-12 h-12 text-gray-700 mb-3" />
            <p className="text-gray-400">No audit events recorded yet</p>
            <p className="text-gray-600 text-sm mt-1">Actions like payments, transfers, and tenant creation will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {logs.map((log) => {
              const meta = ACTION_META[log.action] ?? { label: log.action, color: "text-gray-400", icon: Shield };
              const Icon = meta.icon;
              const performedBy = log.users
                ? `${log.users.firstName} ${log.users.lastName}`
                : "System";
              const detail = log.details ? formatDetails(log.action, log.details as string) : "";

              return (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-gray-800/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gray-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                      <span className="text-gray-500 text-xs">by</span>
                      <span className="text-gray-300 text-sm">{performedBy}</span>
                      {log.users?.role && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                          {log.users.role}
                        </span>
                      )}
                    </div>
                    {detail && (
                      <p className="text-gray-400 text-sm mt-0.5 truncate">{detail}</p>
                    )}
                    <p className="text-gray-600 text-xs mt-0.5">
                      {log.entityType} · {(log.entityId ?? "").slice(0, 16)}...
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-gray-500 text-xs">{timeAgo(log.createdAt)}</p>
                    <p className="text-gray-700 text-xs mt-0.5">
                      {log.createdAt.toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">
            Showing {skip + 1}–{Math.min(skip + pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`/dashboard/admin/audit?${actionFilter ? `action=${actionFilter}&` : ""}page=${page - 1}`}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm hover:bg-gray-700 transition-colors"
              >
                Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={`/dashboard/admin/audit?${actionFilter ? `action=${actionFilter}&` : ""}page=${page + 1}`}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm hover:bg-gray-700 transition-colors flex items-center gap-1"
              >
                Next <ChevronRight className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
