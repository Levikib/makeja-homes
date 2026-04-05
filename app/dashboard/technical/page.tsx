"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Wrench, AlertTriangle, Clock, CheckCircle } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function TechnicalPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/maintenance")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading...</div>;

  const requests = data?.requests ?? [];
  const stats = data?.stats ?? {};
  const urgent = requests.filter((r: any) => ["URGENT", "EMERGENCY"].includes(r.priority) && r.status !== "COMPLETED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Technical Dashboard</h1>
        <p className="text-gray-400 mt-1">Maintenance overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-yellow-400" /><span className="text-gray-400 text-sm">Open</span></div>
          <p className="text-3xl font-bold text-white">{stats.openCount ?? 0}</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-5 h-5 text-blue-400" /><span className="text-gray-400 text-sm">In Progress</span></div>
          <p className="text-3xl font-bold text-white">{stats.inProgressCount ?? 0}</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-5 h-5 text-green-400" /><span className="text-gray-400 text-sm">Completed</span></div>
          <p className="text-3xl font-bold text-white">{stats.completedCount ?? 0}</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-red-400" /><span className="text-gray-400 text-sm">Urgent</span></div>
          <p className="text-3xl font-bold text-white">{urgent.length}</p>
        </div>
      </div>

      {urgent.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4">Urgent / Emergency</h2>
          <div className="space-y-3">
            {urgent.map((r: any) => (
              <Link key={r.id} href={`/dashboard/maintenance/${r.id}`}>
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 cursor-pointer">
                  <div>
                    <p className="text-white font-medium">{r.title}</p>
                    <p className="text-gray-400 text-sm">{r.units?.properties?.name} — Unit {r.units?.unitNumber}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">{r.priority}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">All Open Requests</h2>
        <div className="space-y-3">
          {requests.filter((r: any) => r.status !== "COMPLETED").slice(0, 20).map((r: any) => (
            <Link key={r.id} href={`/dashboard/maintenance/${r.id}`}>
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 cursor-pointer">
                <div>
                  <p className="text-white font-medium">{r.title}</p>
                  <p className="text-gray-400 text-sm">{r.units?.properties?.name} — Unit {r.units?.unitNumber}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${r.status === "IN_PROGRESS" ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"}`}>{r.status}</span>
              </div>
            </Link>
          ))}
          {requests.filter((r: any) => r.status !== "COMPLETED").length === 0 && (
            <p className="text-gray-400 text-center py-8">No open maintenance requests</p>
          )}
        </div>
      </div>
    </div>
  );
}
