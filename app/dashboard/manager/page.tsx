"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Users, DollarSign, Wrench, AlertCircle, TrendingUp } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function ManagerDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading dashboard...</div>;
  if (!stats) return <div className="text-white p-6">Failed to load dashboard.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Manager Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your properties</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            <span className="text-gray-400 text-sm">Properties</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalProperties ?? 0}</p>
        </div>

        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-green-400" />
            <span className="text-gray-400 text-sm">Active Tenants</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.activeTenants ?? 0}</p>
          <p className="text-gray-400 text-xs mt-1">{stats.totalUnits ?? 0} total units</p>
        </div>

        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-purple-400" />
            <span className="text-gray-400 text-sm">This Month</span>
          </div>
          <p className="text-2xl font-bold text-white">KSH {(stats.thisMonthRevenue ?? 0).toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-700/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-5 h-5 text-orange-400" />
            <span className="text-gray-400 text-sm">Open Maintenance</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.openMaintenance ?? 0}</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: "/dashboard/admin/properties", label: "Properties", icon: Building2 },
          { href: "/dashboard/admin/tenants", label: "Tenants", icon: Users },
          { href: "/dashboard/admin/leases", label: "Leases", icon: TrendingUp },
          { href: "/dashboard/admin/maintenance", label: "Maintenance", icon: Wrench },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition cursor-pointer flex items-center gap-3">
              <Icon className="w-5 h-5 text-gray-400" />
              <span className="text-white font-medium">{label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
