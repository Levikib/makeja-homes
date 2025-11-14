import { requireRole } from "@/lib/auth-helpers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, DollarSign, FileText } from "lucide-react"

export default async function ManagerDashboardPage() {
  const user = await requireRole(["ADMIN", "MANAGER"])

  const stats = [
    {
      title: "Active Leases",
      value: "118",
      description: "Currently active",
      icon: FileText,
    },
    {
      title: "Occupancy Rate",
      value: "94%",
      description: "Across all properties",
      icon: Building2,
    },
    {
      title: "Rent Collection",
      value: "88%",
      description: "This month",
      icon: DollarSign,
    },
    {
      title: "New Applications",
      value: "7",
      description: "Awaiting review",
      icon: Users,
    },
  ]

  return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manager Dashboard</h2>
          <p className="text-muted-foreground">
            Property and tenant management overview
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

        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>Your pending tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No pending tasks
            </p>
          </CardContent>
        </Card>
      </div>
  )
}
