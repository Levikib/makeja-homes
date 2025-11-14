import { requireRole } from "@/lib/auth-helpers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wrench, Clock, CheckCircle, AlertCircle } from "lucide-react"

export default async function TechnicalDashboardPage() {
  const user = await requireRole(["ADMIN", "MANAGER", "TECHNICAL"])

  const stats = [
    {
      title: "Active Work Orders",
      value: "8",
      description: "In progress",
      icon: Wrench,
    },
    {
      title: "Pending Requests",
      value: "15",
      description: "Awaiting assignment",
      icon: Clock,
    },
    {
      title: "Completed Today",
      value: "3",
      description: "Tasks finished",
      icon: CheckCircle,
    },
    {
      title: "High Priority",
      value: "2",
      description: "Urgent repairs",
      icon: AlertCircle,
    },
  ]

  return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Technical Dashboard</h2>
          <p className="text-muted-foreground">
            Maintenance and renovation management
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
            <CardTitle>Today's Schedule</CardTitle>
            <CardDescription>Your work assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No scheduled tasks for today
            </p>
          </CardContent>
        </Card>
      </div>
  )
}
