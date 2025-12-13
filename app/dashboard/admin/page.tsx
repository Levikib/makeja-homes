"use client";

import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";
import { Building2, Users, FileText, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then(setStats);
  }, []);

  if (!stats) return <div className="text-white p-6">Loading dashboard...</div>;

  const revenueData = [
    { month: "Jan", revenue: 450000, expenses: 180000 },
    { month: "Feb", revenue: 520000, expenses: 200000 },
    { month: "Mar", revenue: 480000, expenses: 190000 },
    { month: "Apr", revenue: 550000, expenses: 210000 },
    { month: "May", revenue: 600000, expenses: 220000 },
    { month: "Jun", revenue: 580000, expenses: 215000 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <span className="text-4xl">⚡</span> Welcome back, Admin!
        </h1>
        <p className="text-gray-400 mt-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Here's your property overview
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-700/30 rounded-xl p-5 overflow-hidden hover:border-purple-500/60 transition-all hover:shadow-lg hover:shadow-purple-500/30 cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-pulse" />
          </div>
          <div className="relative flex items-center justify-between mb-2">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Properties</p>
            <span className="text-3xl">🏢</span>
          </div>
          <p className="text-4xl font-bold text-white relative mb-1">{stats.properties}</p>
          <p className="text-green-400 text-xs flex items-center gap-1">
            <span>↑ 12.5%</span>
            <span className="text-gray-500">vs last month</span>
          </p>
        </div>

        <div className="group relative bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-700/30 rounded-xl p-5 overflow-hidden hover:border-cyan-500/60 transition-all hover:shadow-lg hover:shadow-cyan-500/30 cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse" />
          </div>
          <div className="relative flex items-center justify-between mb-2">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Units</p>
            <span className="text-3xl">🏠</span>
          </div>
          <p className="text-4xl font-bold text-white relative mb-1">{stats.units}</p>
          <p className="text-green-400 text-xs flex items-center gap-1">
            <span>↑ 8.2%</span>
            <span className="text-gray-500">vs last month</span>
          </p>
        </div>

        <div className="group relative bg-gradient-to-br from-pink-900/20 to-rose-900/20 border border-pink-700/30 rounded-xl p-5 overflow-hidden hover:border-pink-500/60 transition-all hover:shadow-lg hover:shadow-pink-500/30 cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-pink-500 to-transparent animate-pulse" />
          </div>
          <div className="relative flex items-center justify-between mb-2">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Active Tenants</p>
            <span className="text-3xl">👥</span>
          </div>
          <p className="text-4xl font-bold text-white relative mb-1">{stats.tenants}</p>
          <p className="text-green-400 text-xs flex items-center gap-1">
            <span>↑ 5.4%</span>
            <span className="text-gray-500">vs last month</span>
          </p>
        </div>

        <div className="group relative bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-xl p-5 overflow-hidden hover:border-green-500/60 transition-all hover:shadow-lg hover:shadow-green-500/30 cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-500 to-transparent animate-pulse" />
          </div>
          <div className="relative flex items-center justify-between mb-2">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Monthly Revenue</p>
            <span className="text-3xl">💰</span>
          </div>
          <p className="text-3xl font-bold text-white relative mb-1">KSH {stats.revenue.toLocaleString()}</p>
          <p className="text-green-400 text-xs flex items-center gap-1">
            <span>↑ 15.3%</span>
            <span className="text-gray-500">vs last month</span>
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all">
          <div className="mb-4">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Revenue Overview
            </h2>
            <p className="text-gray-400 text-sm">Monthly performance tracking</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "0.5rem",
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="expenses" stroke="#ec4899" fillOpacity={1} fill="url(#colorExpenses)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-gray-400 text-sm">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pink-500" />
              <span className="text-gray-400 text-sm">Expenses</span>
            </div>
          </div>
        </div>

        {/* Occupancy Gauge - FIXED */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all">
          <h3 className="text-xl font-semibold text-white mb-4">Occupancy Rate</h3>
          <div className="flex items-center justify-center my-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  className="text-gray-700"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                  r="42"
                  cx="50"
                  cy="50"
                />
                <circle
                  className="text-cyan-500 transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray={`${(stats.occupancyRate / 100) * 264}, 264`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="42"
                  cx="50"
                  cy="50"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-cyan-600 bg-clip-text text-transparent">
                    {stats.occupancyRate}%
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Occupied</span>
              <span className="text-green-400 font-bold text-lg">{stats.occupiedUnits}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Vacant</span>
              <span className="text-red-400 font-bold text-lg">{stats.vacantUnits}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - SMALLER */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-600 bg-clip-text text-transparent mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/properties/new">
            <div className="group relative bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4 overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Building2 className="w-6 h-6 text-white mb-2" />
              <p className="text-white font-semibold">Add Property</p>
            </div>
          </Link>

          <Link href="/dashboard/admin/tenants/new">
            <div className="group relative bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-lg p-4 overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Users className="w-6 h-6 text-white mb-2" />
              <p className="text-white font-semibold">Add Tenant</p>
            </div>
          </Link>

          <Link href="/dashboard/admin/leases/new">
            <div className="group relative bg-gradient-to-br from-pink-600 to-pink-700 rounded-lg p-4 overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:shadow-pink-500/50">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <FileText className="w-6 h-6 text-white mb-2" />
              <p className="text-white font-semibold">Create Lease</p>
            </div>
          </Link>

          <Link href="/dashboard/admin/payments">
            <div className="group relative bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-4 overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/50">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <TrendingUp className="w-6 h-6 text-white mb-2" />
              <p className="text-white font-semibold">View Reports</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-600 bg-clip-text text-transparent mb-4">
          Recent Activity
        </h2>
        <div className="space-y-3">
          <div className="flex items-start gap-4 p-3 bg-gray-900/50 rounded-lg border-l-4 border-purple-500">
            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">New tenant added</p>
              <p className="text-gray-400 text-xs">Property Management</p>
            </div>
            <span className="text-gray-500 text-xs">2 mins ago</span>
          </div>

          <div className="flex items-start gap-4 p-3 bg-gray-900/50 rounded-lg border-l-4 border-green-500">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Unit updated</p>
              <p className="text-gray-400 text-xs">Occupancy Status</p>
            </div>
            <span className="text-gray-500 text-xs">1 hour ago</span>
          </div>

          <div className="flex items-start gap-4 p-3 bg-gray-900/50 rounded-lg border-l-4 border-blue-500">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Property created</p>
              <p className="text-gray-400 text-xs">Portfolio Expanded</p>
            </div>
            <span className="text-gray-500 text-xs">3 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
