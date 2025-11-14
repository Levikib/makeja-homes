import { requireRole } from "@/lib/auth-helpers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, DollarSign, FileText, AlertCircle } from "lucide-react"

export default async function TenantDashboardPage() {
  const user = await requireRole(["ADMIN", "MANAGER", "TENANT"])

  const stats = [
    {
      title: "Current Rent",
      value: "KSh 25,000",
      description: "Monthly rent",
      icon: DollarSign,
    },
    {
      title: "Payment Status",
      value: "Paid",
      description: "November 2025",
      icon: FileText,
    },
    {
      title: "Lease Expiry",
      value: "6 months",
      description: "Until May 2026",
      icon: Home,
    },
    {
      title: "Maintenance",
      value: "0",
      description: "Open requests",
      icon: AlertCircle,
    },
  ]

  return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tenant Dashboard</h2>
          <p className="text-muted-foreground">
            Your rental information and services
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                • Make a payment
              </p>
              <p className="text-sm text-muted-foreground">
                • Submit maintenance request
              </p>
              <p className="text-sm text-muted-foreground">
                • View lease details
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
              <CardDescription>Latest updates</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No new announcements
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}
