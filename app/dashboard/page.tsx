import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth-helpers"
import { getDashboardPath } from "@/lib/auth-helpers"

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Redirect to role-specific dashboard
  const dashboardPath = getDashboardPath(user.role)
  redirect(dashboardPath)
}
