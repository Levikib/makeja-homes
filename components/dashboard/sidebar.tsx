"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Package,
  Wrench,
  DollarSign,
  Settings,
  LogOut,
  Home,
  ShoppingCart,
  Receipt,
  Wallet,
  Repeat
} from "lucide-react"
import { UserRole } from "@prisma/client"

interface SidebarProps {
  role: UserRole
  userName: string
}

const roleNavigation: Record<UserRole, Array<{ name: string; href: string; icon: any }>> = {
  ADMIN: [
    { name: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    { name: "Properties", href: "/dashboard/admin/properties", icon: Building2 },
    { name: "Users", href: "/dashboard/admin/users", icon: Users },
    { name: "Tenants", href: "/dashboard/admin/tenants", icon: Users },
    { name: "Utilities", href: "/dashboard/admin/billing", icon: Receipt },
    { name: "Bills", href: "/dashboard/admin/bills", icon: FileText },
    { name: "Payments", href: "/dashboard/admin/payments", icon: Wallet },
    { name: "Recurring Charges", href: "/dashboard/admin/recurring-charges", icon: Repeat },
    { name: "Leases", href: "/dashboard/admin/leases", icon: FileText },
    { name: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package },
    { name: "Purchase Orders", href: "/dashboard/purchase-orders", icon: ShoppingCart },
    { name: "Expenses", href: "/dashboard/admin/expenses", icon: DollarSign },
    { name: "Settings", href: "/dashboard/admin/settings", icon: Settings },
  ],
  MANAGER: [
    { name: "Dashboard", href: "/dashboard/manager", icon: LayoutDashboard },
    { name: "Properties", href: "/dashboard/admin/properties", icon: Building2 },
    { name: "Tenants", href: "/dashboard/manager/tenants", icon: Users },
    { name: "Utilities", href: "/dashboard/admin/billing", icon: Receipt },
    { name: "Bills", href: "/dashboard/admin/bills", icon: FileText },
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
  TECHNICAL: [
    { name: "Dashboard", href: "/dashboard/technical", icon: LayoutDashboard },
    { name: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package },
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

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const navigation = roleNavigation[role] || []

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      router.push("/auth/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold">Makeja Homes</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 py-2">
          <p className="text-xs text-gray-400">Welcome back,</p>
          <p className="font-semibold">{userName}</p>
          <p className="text-xs text-gray-400">{role}</p>
        </div>

        <nav className="mt-4 space-y-1 px-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-gray-800 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:bg-gray-800 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  )
}
