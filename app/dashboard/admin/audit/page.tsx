"use client";
import { useState, useEffect } from "react";
import { Shield, User, DollarSign, Home, ArrowRightLeft, FileText, Wrench, ChevronRight } from "lucide-react";

export const dynamic = 'force-dynamic';

const ACTION_ICONS: Record<string, any> = {
  LOGIN: User, LOGOUT: User, CREATE: Home, UPDATE: FileText,
  DELETE: FileText, PAYMENT: DollarSign, TRANSFER: ArrowRightLeft,
  MAINTENANCE: Wrench, TENANT_CREATED: User, UNIT_TRANSFER: ArrowRightLeft,
};

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // activity_logs via a simple API call - we'll use a generic approach
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(() => {
        // For now show a placeholder since audit API doesn't exist yet
        setLogs([]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading audit log...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-purple-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Audit Log</h1>
          <p className="text-gray-400">System activity history</p>
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No audit logs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log: any) => {
              const Icon = ACTION_ICONS[log.action] ?? ChevronRight;
              return (
                <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-900/50 rounded-lg">
                  <Icon className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="text-white font-medium">{log.action}</span>
                      <span className="text-gray-400 text-sm">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</span>
                    </div>
                    {log.details && <p className="text-gray-400 text-sm mt-1">{log.details}</p>}
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
