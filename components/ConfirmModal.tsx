"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger",
}: ConfirmModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300);
  };

  const handleConfirm = () => {
    onConfirm();
    handleClose();
  };

  const getColors = () => {
    switch (type) {
      case "danger":
        return {
          border: "border-red-500/50",
          glow: "shadow-red-500/20",
          icon: "text-red-400",
          iconBg: "from-red-600/10 to-red-900/10",
          button: "from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700",
          pulse: "bg-red-500",
        };
      case "warning":
        return {
          border: "border-yellow-500/50",
          glow: "shadow-yellow-500/20",
          icon: "text-yellow-400",
          iconBg: "from-yellow-600/10 to-yellow-900/10",
          button: "from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700",
          pulse: "bg-yellow-500",
        };
      default:
        return {
          border: "border-blue-500/50",
          glow: "shadow-blue-500/20",
          icon: "text-blue-400",
          iconBg: "from-blue-600/10 to-blue-900/10",
          button: "from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
          pulse: "bg-blue-500",
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Animated Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border ${colors.border} rounded-2xl p-8 max-w-md w-full shadow-2xl ${colors.glow} transition-all duration-300 ${
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-${colors.pulse} to-transparent animate-pulse`} />
          <div className={`absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-${colors.pulse} to-transparent animate-pulse`} />
          <div className={`absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-${colors.pulse} to-transparent animate-pulse`} />
          <div className={`absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-${colors.pulse} to-transparent animate-pulse`} />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="relative">
          {/* Icon with animated ring */}
          <div className="flex items-center justify-center mb-6">
            <div className={`relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br ${colors.iconBg} border ${colors.border} ${colors.glow}`}>
              {/* Animated pulse ring */}
              <div className={`absolute inset-0 rounded-full ${colors.border} animate-ping opacity-20`}></div>
              
              {/* Inner circle */}
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gray-900">
                <AlertTriangle className={`w-10 h-10 ${colors.icon}`} />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-4">
            {title}
          </h2>

          {/* Message */}
          <p className="text-gray-300 text-center mb-8 leading-relaxed">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-600"
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              className={`flex-1 bg-gradient-to-r ${colors.button} shadow-lg font-semibold`}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
