"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number; expenses: number }>;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card p-6"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold gradient-text mb-1">
          Revenue Overview
        </h2>
        <p className="text-gray-400 text-sm">Monthly performance tracking</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
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
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(138, 92, 246, 0.1)"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `KSH ${value / 1000}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(26, 19, 64, 0.95)",
              border: "1px solid rgba(138, 92, 246, 0.3)",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            }}
            labelStyle={{ color: "#c4b5fd" }}
            itemStyle={{ color: "#e9d5ff" }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#8b5cf6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            filter="drop-shadow(0 0 10px rgba(139, 92, 246, 0.5))"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="#ec4899"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorExpenses)"
            filter="drop-shadow(0 0 10px rgba(236, 72, 153, 0.5))"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50" />
          <span className="text-sm text-gray-400">Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-pink-500 shadow-lg shadow-pink-500/50" />
          <span className="text-sm text-gray-400">Expenses</span>
        </div>
      </div>
    </motion.div>
  );
}
