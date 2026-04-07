"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Menu, X, LayoutDashboard, Building2, Users, FileText, Package, Wrench,
  DollarSign, Settings, LogOut, Home, ShoppingCart, Receipt, Wallet,
  Repeat, BarChart3, Zap, Brain, Calculator, UserCircle, DoorOpen,
  Shield, ChevronRight,
} from "lucide-react"
import { Role } from "@prisma/client"
import { InstanceSwitcher } from "./InstanceSwitcher"

interface NavItem {
  name: string
  href?: string
  icon: any
  children?: { name: string; href: string }[]
}

const roleNavigation: Record<Role, NavItem[]> = {
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

interface MobileNavProps {
  role: Role
  userName: string
}

export function MobileNav({ role, userName }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const pathname = usePathname()
  const router = useRouter()
  const navigation = roleNavigation[role] || []

  // Auto-open the group that contains the current path on mount
  useEffect(() => {
    const initial: Record<string, boolean> = {}
    navigation.forEach((item) => {
      if (item.children) {
        const active = item.children.some((c) => pathname.startsWith(c.href))
        if (active) initial[item.name] = true
      }
    })
    setOpenGroups(initial)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  const toggleGroup = (name: string) =>
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }))

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <>
      {/* Top bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-gray-950 border-b border-gray-800/60 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-white">Makeja Homes</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
        >
          <Menu size={20} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-gray-950 border-r border-gray-800/60 flex flex-col transition-transform duration-300 ease-in-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-800/60 flex-shrink-0">
          <span className="text-sm font-bold text-white">Makeja Homes</span>
          <button onClick={() => setOpen(false)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition">
            <X size={18} />
          </button>
        </div>

        {/* User chip */}
        <div className="px-3 py-2.5 border-b border-gray-800/60 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-xs font-medium text-white">{userName}</p>
              <p className="text-[10px] text-gray-500">{role}</p>
            </div>
          </div>
          <InstanceSwitcher />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon

            if (!item.children) {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href!}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-orange-500/15 text-orange-400" : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.name}
                </Link>
              )
            }

            const isGroupActive = item.children.some((c) => pathname.startsWith(c.href))
            const isOpen = openGroups[item.name] ?? false

            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleGroup(item.name)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isGroupActive ? "text-orange-400" : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.name}</span>
                  <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen ? "rotate-90" : "")} />
                </button>
                {isOpen && (
                  <div className="ml-5 pl-2.5 border-l border-gray-800 mt-0.5 mb-0.5 space-y-0.5">
                    {item.children.map((child) => {
                      const isChildActive = pathname === child.href || pathname.startsWith(child.href + "/")
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "block rounded-md px-2.5 py-1.5 text-sm transition-colors",
                            isChildActive ? "text-orange-400 font-medium" : "text-gray-500 hover:text-gray-200 hover:bg-gray-800/40"
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

        <div className="border-t border-gray-800/60 p-2 space-y-0.5 flex-shrink-0">
          <Link href="/dashboard/profile" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 transition-colors">
            <UserCircle className="h-4 w-4" />
            My Profile
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800/50 hover:text-red-400 transition-colors">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </>
  )
}
