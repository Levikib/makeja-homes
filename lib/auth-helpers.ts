import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth"
import { UserRole } from "@prisma/client"
import { redirect } from "next/navigation"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/auth/login")
  }
  return user
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    redirect("/unauthorized")
  }
  return user
}

// Get dashboard path based on role
export function getDashboardPath(role: UserRole): string {
  const dashboardPaths: Record<UserRole, string> = {
    ADMIN: "/dashboard/admin",
    MANAGER: "/dashboard/manager",
    STOREKEEPER: "/dashboard/storekeeper",
    TECHNICAL: "/dashboard/technical",
    CARETAKER: "/dashboard/caretaker",
    TENANT: "/dashboard/tenant",
  }
  return dashboardPaths[role]
}
