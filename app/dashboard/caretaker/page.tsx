"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Home, Wrench, CheckCircle, Clock, AlertTriangle } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function CaretakerDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then(r => r.json()),
      fetch("/api/maintenance").then(r => r.json()),
    ]).then(([s, m]) => {
      setStats(s);
      setMaintenance(m.requests ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading dashboard...</div>;

  const open = maintenance.filter((r: any) => ["PENDING", "OPEN"].includes(r.status));
  const inProgress = maintenance.filter((r: any) => r.status === "IN_PROGRESS");
  const completed = maintenance.filter((r: any) => r.status === "COMPLETED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Caretaker Dashboard</h1>
        <p className="text-gray-400 mt-1">Maintenance overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2"><Building2 className="w-5 h-5 text-blue-400" /><span className="text-gray-400 text-sm">Properties</span></div>
          <p className="text-3xl font-bold text-white">{stats?.totalProperties ?? 0}</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-yellow-400" /><span className="text-gray-400 text-sm">Open</span></div>
          <p className="text-3xl font-bold text-white">{open.length}</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-5 h-5 text-orange-400" /><span className="text-gray-400 text-sm">In Progress</span></div>
          <p className="text-3xl font-bold text-white">{inProgress.length}</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-5 h-5 text-green-400" /><span className="text-gray-400 text-sm">Completed</span></div>
          <p className="text-3xl font-bold text-white">{completed.length}</p>
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Open Maintenance Requests</h2>
        {open.length === 0 ? (
          <p className="text-gray-400">No open maintenance requests</p>
        ) : (
          <div className="space-y-3">
            {open.slice(0, 10).map((r: any) => (
              <Link key={r.id} href={`/dashboard/maintenance/${r.id}`}>
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition cursor-pointer">
                  <div>
                    <p className="text-white font-medium">{r.title}</p>
                    <p className="text-gray-400 text-sm">{r.units?.properties?.name} — Unit {r.units?.unitNumber}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${r.priority === "URGENT" || r.priority === "EMERGENCY" ? "bg-red-500/20 text-red-400" : r.priority === "HIGH" ? "bg-orange-500/20 text-orange-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                    {r.priority}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
