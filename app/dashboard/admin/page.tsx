"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/stat-card";
import CircularProgress from "@/components/dashboard/circular-progress";
import RevenueChart from "@/components/dashboard/revenue-chart";
import MiniStat from "@/components/dashboard/mini-stat";
import Link from "next/link";
import {
  Building2,
  Home,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Calendar,
  Zap,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    properties: 0,
    units: 0,
    tenants: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    occupancyRate: 0,
    totalRevenue: 0,
    userName: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { month: "Jan", revenue: 450000, expenses: 280000 },
    { month: "Feb", revenue: 520000, expenses: 310000 },
    { month: "Mar", revenue: 480000, expenses: 295000 },
    { month: "Apr", revenue: 580000, expenses: 320000 },
    { month: "May", revenue: 620000, expenses: 340000 },
    { month: "Jun", revenue: 680000, expenses: 360000 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner">
          <Zap className="h-12 w-12 text-purple-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 min-h-screen relative">
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />

      <div className="relative z-10">
        <h1 className="text-5xl font-bold gradient-text mb-2 flex items-center gap-3">
          <Zap className="h-12 w-12 text-purple-500 animate-pulse" />
          Welcome back, {stats.userName || 'Admin'}!
        </h1>
        <p className="text-gray-400 text-lg flex items-center gap-2">
          <span className="status-dot bg-green-400"></span>
          Here's your property overview
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        <StatCard
          title="Total Properties"
          value={stats.properties}
          icon={Building2}
          color="purple"
          trend={{ value: 12.5, isPositive: true }}
          delay={0}
        />
        <StatCard
          title="Total Units"
          value={stats.units}
          icon={Home}
          color="blue"
          trend={{ value: 8.2, isPositive: true }}
          delay={0.1}
        />
        <StatCard
          title="Active Tenants"
          value={stats.tenants}
          icon={Users}
          color="pink"
          trend={{ value: 5.4, isPositive: true }}
          delay={0.2}
        />
        <StatCard
          title="Monthly Revenue"
          value={`KSH ${stats.totalRevenue.toLocaleString('en-US')}`}
          icon={DollarSign}
          color="green"
          trend={{ value: 15.3, isPositive: true }}
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        <div className="lg:col-span-2">
          <RevenueChart data={chartData} />
        </div>

        <div className="glass-card p-6 flex flex-col items-center justify-center">
          <CircularProgress
            percentage={stats.occupancyRate}
            label="Occupancy Rate"
            color="#8b5cf6"
          />
          <div className="mt-6 w-full space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Occupied</span>
              <span className="text-lg font-bold text-green-400">
                {stats.occupiedUnits}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Vacant</span>
              <span className="text-lg font-bold text-orange-400">
                {stats.vacantUnits}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        <MiniStat
          label="Occupied Units"
          value={stats.occupiedUnits}
          icon={Home}
          color="#22c55e"
          delay={0}
        />
        <MiniStat
          label="Vacant Units"
          value={stats.vacantUnits}
          icon={AlertCircle}
          color="#f59e0b"
          delay={0.1}
        />
        <MiniStat
          label="Total Properties"
          value={stats.properties}
          icon={Building2}
          color="#8b5cf6"
          delay={0.2}
        />
        <MiniStat
          label="Active Tenants"
          value={stats.tenants}
          icon={Users}
          color="#ec4899"
          delay={0.3}
        />
      </div>

      <div className="glass-card p-6 relative z-10">
        <h2 className="text-2xl font-bold gradient-text mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/dashboard/properties/new">
            <button className="w-full p-4 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-105 transition-transform">
              <Building2 className="h-6 w-6 mb-2 mx-auto" />
              <span className="text-sm font-medium">Add Property</span>
            </button>
          </Link>
          <Link href="/dashboard/admin/tenants/new">
            <button className="w-full p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 hover:scale-105 transition-transform">
              <Users className="h-6 w-6 mb-2 mx-auto" />
              <span className="text-sm font-medium">Add Tenant</span>
            </button>
          </Link>
          <Link href="/dashboard/admin/leases/new">
            <button className="w-full p-4 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 hover:scale-105 transition-transform">
              <Calendar className="h-6 w-6 mb-2 mx-auto" />
              <span className="text-sm font-medium">Create Lease</span>
            </button>
          </Link>
          <Link href="/dashboard/properties">
            <button className="w-full p-4 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 hover:scale-105 transition-transform">
              <TrendingUp className="h-6 w-6 mb-2 mx-auto" />
              <span className="text-sm font-medium">View Reports</span>
            </button>
          </Link>
        </div>
      </div>

      <div className="glass-card p-6 relative z-10">
        <h2 className="text-2xl font-bold gradient-text mb-6">Recent Activity</h2>
        <div className="space-y-4">
          {[
            { action: "New tenant added", property: "Property Management", time: "2 mins ago", color: "#8b5cf6" },
            { action: "Unit updated", property: "Occupancy Status", time: "1 hour ago", color: "#22c55e" },
            { action: "Property created", property: "Portfolio Expanded", time: "3 hours ago", color: "#3b82f6" },
            { action: "System backup", property: "Data Secured", time: "5 hours ago", color: "#ec4899" },
          ].map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-transparent to-purple-900/10 hover:to-purple-900/20 transition-all cursor-pointer border-l-2"
              style={{ borderColor: activity.color }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: activity.color, boxShadow: `0 0 10px ${activity.color}` }}
                />
                <div>
                  <p className="text-white font-medium">{activity.action}</p>
                  <p className="text-sm text-gray-400">{activity.property}</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
