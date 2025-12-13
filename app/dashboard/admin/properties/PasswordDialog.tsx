"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, X, Lock } from "lucide-react";

interface PasswordDialogProps {
  title: string;
  message: string;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}

export default function PasswordDialog({ title, message, onConfirm, onCancel }: PasswordDialogProps) {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(password);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-gray-900 to-gray-800 border border-red-500/30 rounded-lg p-6 max-w-md w-full"
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={32} className="text-red-400" />
          <h3 className="text-2xl font-bold text-red-400">{title}</h3>
        </div>

        <p className="text-gray-300 mb-6">{message}</p>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm font-semibold mb-2">
            ⚠️ THIS ACTION CANNOT BE UNDONE!
          </p>
          <p className="text-red-400 text-sm">
            Enter your admin password to confirm this irreversible action.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Admin Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-red-500 focus:outline-none"
                placeholder="Enter admin password"
                autoFocus
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-rose-500 rounded-lg text-white hover:from-red-600 hover:to-rose-600 transition-all"
            >
              Confirm Delete
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
