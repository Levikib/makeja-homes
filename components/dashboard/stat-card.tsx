"use client";

import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "purple" | "blue" | "pink" | "green";
  delay?: number;
}

const colorClasses = {
  purple: "from-purple-500 to-purple-700",
  blue: "from-blue-500 to-cyan-500",
  pink: "from-pink-500 to-rose-500",
  green: "from-green-500 to-emerald-500",
};

const glowColors = {
  purple: "rgba(168, 85, 247, 0.4)",
  blue: "rgba(59, 130, 246, 0.4)",
  pink: "rgba(236, 72, 153, 0.4)",
  green: "rgba(34, 197, 94, 0.4)",
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = "purple",
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card hover-lift metric-card relative overflow-hidden p-6"
      style={{
        boxShadow: `0 0 30px ${glowColors[color]}`,
      }}
    >
      {/* Animated background gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
        <div
          className={`w-full h-full rounded-full blur-3xl bg-gradient-to-br ${colorClasses[color]}`}
        />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">
            {title}
          </p>
          <div
            className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-4xl font-bold gradient-text mb-1">{value}</h3>
            {trend && (
              <div className="flex items-center gap-1">
                <span
                  className={`text-sm font-semibold ${
                    trend.isPositive ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-gray-500">vs last month</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none">
        <div
          className={`absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r ${colorClasses[color]} opacity-0 group-hover:opacity-50 transition-opacity duration-300`}
          style={{ padding: "2px", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }}
        />
      </div>
    </motion.div>
  );
}
