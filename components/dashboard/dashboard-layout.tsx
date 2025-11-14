import { ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { UserRole } from "@prisma/client"

interface DashboardLayoutProps {
  children: ReactNode
  role: UserRole
  userName: string
}

export function DashboardLayout({ children, role, userName }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} userName={userName} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}
