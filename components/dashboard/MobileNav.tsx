"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Menu, X, LayoutDashboard, Building2, Users, FileText, Package, Wrench,
  DollarSign, Settings, LogOut, Home, ShoppingCart, Receipt, Wallet,
  Repeat, BarChart3, Zap, Brain, Calculator, UserCircle, DoorOpen, Shield,
} from "lucide-react"
import { Role } from "@prisma/client"

interface MobileNavProps {
  role: Role
  userName: string
}

const roleNavigation: Record<Role, Array<{ name: string; href: string; icon: any }>> = {
  ADMIN: [
    { name: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    { name: "Properties", href: "/dashboard/admin/properties", icon: Building2 },
    { name: "Users", href: "/dashboard/admin/users", icon: Users },
    { name: "Tenants", href: "/dashboard/admin/tenants", icon: Users },
    { name: "Utilities", href: "/dashboard/admin/utilities", icon: Receipt },
    { name: "Payments", href: "/dashboard/admin/payments", icon: Wallet },
    { name: "Recurring Charges", href: "/dashboard/admin/recurring-charges", icon: Repeat },
    { name: "Leases", href: "/dashboard/admin/leases", icon: FileText },
    { name: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package },
    { name: "Purchase Orders", href: "/dashboard/purchase-orders", icon: ShoppingCart },
    { name: "Expenses", href: "/dashboard/admin/expenses", icon: DollarSign },
    { name: "Reports", href: "/dashboard/admin/reports", icon: BarChart3 },
    { name: "Tax & Compliance", href: "/dashboard/admin/tax", icon: Calculator },
    { name: "Insights", href: "/dashboard/admin/insights", icon: Brain },
    { name: "Vacate Notices", href: "/dashboard/admin/vacate", icon: DoorOpen },
    { name: "Bulk Operations", href: "/dashboard/admin/bulk", icon: Zap },
    { name: "Audit Log", href: "/dashboard/admin/audit", icon: Shield },
    { name: "Settings", href: "/dashboard/admin/settings", icon: Settings },
  ],
  MANAGER: [
    { name: "Dashboard", href: "/dashboard/manager", icon: LayoutDashboard },
    { name: "Properties", href: "/dashboard/admin/properties", icon: Building2 },
    { name: "Tenants", href: "/dashboard/manager/tenants", icon: Users },
    { name: "Utilities", href: "/dashboard/admin/utilities", icon: Receipt },
    { name: "Payments", href: "/dashboard/admin/payments", icon: Wallet },
    { name: "Recurring Charges", href: "/dashboard/admin/recurring-charges", icon: Repeat },
    { name: "Leases", href: "/dashboard/manager/leases", icon: FileText },
    { name: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package },
    { name: "Expenses", href: "/dashboard/manager/expenses", icon: DollarSign },
  ],
  STOREKEEPER: [
    { name: "Dashboard", href: "/dashboard/storekeeper", icon: LayoutDashboard },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package },
    { name: "Purchase Orders", href: "/dashboard/purchase-orders", icon: ShoppingCart },
  ],
  CARETAKER: [
    { name: "Dashboard", href: "/dashboard/caretaker", icon: LayoutDashboard },
    { name: "Properties", href: "/dashboard/admin/properties", icon: Building2 },
    { name: "Units", href: "/dashboard/units", icon: Home },
    { name: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
  ],
  TENANT: [
    { name: "Dashboard", href: "/dashboard/tenant", icon: LayoutDashboard },
    { name: "My Unit", href: "/dashboard/tenant/unit", icon: Home },
    { name: "Payments", href: "/dashboard/tenant/payments", icon: DollarSign },
    { name: "Lease", href: "/dashboard/tenant/lease", icon: FileText },
    { name: "Maintenance", href: "/dashboard/tenant/maintenance", icon: Wrench },
  ],
}

export function MobileNav({ role, userName }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const navigation = roleNavigation[role] || []

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <>
      {/* Top bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
        <span className="font-bold text-white">Makeja Homes</span>
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300 ease-in-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-800 flex-shrink-0">
          <span className="font-bold text-white">Makeja Homes</span>
          <button
            onClick={() => setOpen(false)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <p className="text-xs text-gray-400">Welcome back,</p>
          <p className="font-semibold text-white">{userName}</p>
          <p className="text-xs text-gray-400">{role}</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 p-3 space-y-0.5 flex-shrink-0">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full"
          >
            <UserCircle className="h-5 w-5" />
            My Profile
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>
    </>
  )
}
