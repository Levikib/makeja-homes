"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard, Building2, Users, FileText, Package, Wrench,
  DollarSign, Settings, LogOut, Home, ShoppingCart, Receipt, Wallet,
  Repeat, BarChart3, Zap, Brain, Calculator, UserCircle, DoorOpen,
  Shield, ChevronRight, Layers, ClipboardList, TrendingUp,
} from "lucide-react"
import { Role } from "@prisma/client"
import { InstanceSwitcher } from "./InstanceSwitcher"

interface NavItem {
  name: string
  href?: string
  icon: any
  children?: { name: string; href: string }[]
}

type NavGroup = NavItem

const roleNavigation: Record<Role, NavGroup[]> = {
  ADMIN: [
    { name: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    {
      name: "Properties", icon: Building2,
      children: [
        { name: "All Properties", href: "/dashboard/admin/properties" },
        { name: "Vacate Notices", href: "/dashboard/admin/vacate" },
      ],
    },
    {
      name: "Tenants", icon: Users,
      children: [
        { name: "All Tenants", href: "/dashboard/admin/tenants" },
        { name: "Leases", href: "/dashboard/admin/leases" },
        { name: "Bulk Operations", href: "/dashboard/admin/bulk" },
      ],
    },
    {
      name: "Finance", icon: Wallet,
      children: [
        { name: "Payments", href: "/dashboard/admin/payments" },
        { name: "Utilities", href: "/dashboard/admin/utilities" },
        { name: "Recurring Charges", href: "/dashboard/admin/recurring-charges" },
        { name: "Expenses", href: "/dashboard/admin/expenses" },
      ],
    },
    {
      name: "Operations", icon: Wrench,
      children: [
        { name: "Maintenance", href: "/dashboard/maintenance" },
        { name: "Inventory", href: "/dashboard/inventory" },
        { name: "Purchase Orders", href: "/dashboard/purchase-orders" },
      ],
    },
    {
      name: "Reports", icon: BarChart3,
      children: [
        { name: "Reports", href: "/dashboard/admin/reports" },
        { name: "Insights", href: "/dashboard/admin/insights" },
        { name: "Tax & Compliance", href: "/dashboard/admin/tax" },
        { name: "Audit Log", href: "/dashboard/admin/audit" },
      ],
    },
    {
      name: "People", icon: UserCircle,
      children: [
        { name: "Users", href: "/dashboard/admin/users" },
        { name: "Staff Payroll", href: "/dashboard/admin/hr" },
        { name: "Settings", href: "/dashboard/admin/settings" },
      ],
    },
  ],
  MANAGER: [
    { name: "Dashboard", href: "/dashboard/manager", icon: LayoutDashboard },
    {
      name: "Properties", icon: Building2,
      children: [
        { name: "All Properties", href: "/dashboard/admin/properties" },
      ],
    },
    {
      name: "Tenants", icon: Users,
      children: [
        { name: "All Tenants", href: "/dashboard/manager/tenants" },
        { name: "Leases", href: "/dashboard/manager/leases" },
        { name: "Vacate Notices", href: "/dashboard/admin/vacate" },
      ],
    },
    {
      name: "Finance", icon: Wallet,
      children: [
        { name: "Payments", href: "/dashboard/admin/payments" },
        { name: "Utilities", href: "/dashboard/admin/utilities" },
        { name: "Recurring Charges", href: "/dashboard/admin/recurring-charges" },
        { name: "Expenses", href: "/dashboard/manager/expenses" },
      ],
    },
    {
      name: "Operations", icon: Wrench,
      children: [
        { name: "Maintenance", href: "/dashboard/maintenance" },
        { name: "Inventory", href: "/dashboard/inventory" },
      ],
    },
  ],
  CARETAKER: [
    { name: "Dashboard", href: "/dashboard/caretaker", icon: LayoutDashboard },
    { name: "Properties", href: "/dashboard/admin/properties", icon: Building2 },
    { name: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
  ],
  STOREKEEPER: [
    { name: "Dashboard", href: "/dashboard/storekeeper", icon: LayoutDashboard },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package },
    { name: "Purchase Orders", href: "/dashboard/purchase-orders", icon: ShoppingCart },
  ],
  TENANT: [
    { name: "Dashboard", href: "/dashboard/tenant", icon: LayoutDashboard },
    { name: "My Unit", href: "/dashboard/tenant/unit", icon: Home },
    { name: "Payments", href: "/dashboard/tenant/payments", icon: DollarSign },
    { name: "Lease", href: "/dashboard/tenant/lease", icon: FileText },
    { name: "Maintenance", href: "/dashboard/tenant/maintenance", icon: Wrench },
  ],
}

interface SidebarProps {
  role: Role
  userName: string
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const navigation = roleNavigation[role] || []

  // Track which groups are open — start with the active one open
  const getInitialOpen = () => {
    const open: Record<string, boolean> = {}
    navigation.forEach((item) => {
      if (item.children) {
        const isActive = item.children.some(
          (c) => pathname === c.href || pathname.startsWith(c.href + "/")
        )
        if (isActive) open[item.name] = true
      }
    })
    return open
  }
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpen)

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/auth/login")
      router.refresh()
    } catch {}
  }

  return (
    <div className="flex h-full w-56 flex-col bg-gray-950 border-r border-gray-800/60 text-white">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-gray-800/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white">Makeja Homes</span>
        </div>
      </div>

      {/* User chip */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-800/40">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{userName}</p>
            <p className="text-[10px] text-gray-500 leading-none">{role}</p>
          </div>
        </div>
      </div>

      {/* Instance switcher — only shows when user has multiple instances */}
      <InstanceSwitcher />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-800">
        {navigation.map((item) => {
          const Icon = item.icon

          // Simple link (no children)
          if (!item.children) {
            const isActive = pathname === item.href || (item.href !== "/dashboard/admin" && pathname.startsWith(item.href + "/"))
            return (
              <Link
                key={item.name}
                href={item.href!}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {item.name}
              </Link>
            )
          }

          // Expandable group
          const isGroupActive = item.children.some(
            (c) => pathname === c.href || pathname.startsWith(c.href + "/")
          )
          const isOpen = openGroups[item.name] ?? false

          return (
            <div key={item.name}>
              <button
                onClick={() => toggleGroup(item.name)}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isGroupActive
                    ? "text-orange-400"
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="flex-1 text-left">{item.name}</span>
                <ChevronRight
                  className={cn(
                    "h-3 w-3 transition-transform duration-200 flex-shrink-0",
                    isOpen ? "rotate-90" : ""
                  )}
                />
              </button>

              {/* Children */}
              {isOpen && (
                <div className="ml-4 pl-2 border-l border-gray-800/80 mt-0.5 mb-0.5 space-y-0.5">
                  {item.children.map((child) => {
                    const isChildActive = pathname === child.href || pathname.startsWith(child.href + "/")
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "block rounded-md px-2.5 py-1 text-xs transition-colors",
                          isChildActive
                            ? "text-orange-400 font-medium bg-orange-500/10"
                            : "text-gray-500 hover:text-gray-200 hover:bg-gray-800/40"
                        )}
                      >
                        {child.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800/60 p-2 space-y-0.5">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 transition-colors"
        >
          <UserCircle className="h-3.5 w-3.5" />
          My Profile
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-800/50 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </div>
  )
}
