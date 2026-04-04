"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  {
    href: "/super-admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/super-admin/clients",
    label: "Clients",
    icon: Building2,
    exact: false,
  },
  {
    href: "/super-admin/subscriptions",
    label: "Subscriptions",
    icon: CreditCard,
    exact: false,
  },
  {
    href: "/super-admin/settings",
    label: "Settings",
    icon: Settings,
    exact: false,
  },
];

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  function isActive(item: (typeof navItems)[0]): boolean {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/super-admin/auth", { method: "DELETE" });
    } finally {
      router.replace("/super-admin/login");
    }
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-gray-900/95 border-r border-gray-800 flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">
              Super Admin
            </p>
            <p className="text-gray-500 text-xs">Makeja Homes</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/60"
              }`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${
                  active ? "text-violet-400" : "text-gray-500 group-hover:text-gray-300"
                }`}
              />
              <span className="flex-1">{item.label}</span>
              {active && (
                <ChevronRight className="w-4 h-4 text-violet-400 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all group"
        >
          <LogOut className="w-5 h-5 text-gray-500 group-hover:text-red-400 flex-shrink-0" />
          <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
        </button>
      </div>
    </aside>
  );
}
