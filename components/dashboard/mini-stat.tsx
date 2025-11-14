"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface MiniStatProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  delay?: number;
}

export default function MiniStat({
  label,
  value,
  icon: Icon,
  color = "#8b5cf6",
  delay = 0,
}: MiniStatProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center gap-4 p-4 glass-card hover-lift cursor-pointer"
      style={{
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        className="p-3 rounded-xl"
        style={{
          background: `${color}20`,
          boxShadow: `0 0 20px ${color}30`,
        }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </motion.div>
  );
}
