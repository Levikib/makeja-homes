import { requireRole } from "@/lib/auth-helpers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Home, Wrench, Users } from "lucide-react"

export default async function CaretakerDashboardPage() {
  const user = await requireRole(["ADMIN", "MANAGER", "CARETAKER"])

  const stats = [
    {
      title: "Assigned Properties",
      value: "2",
      description: "Under your care",
      icon: Building2,
    },
    {
      title: "Total Units",
      value: "45",
      description: "In your properties",
      icon: Home,
    },
    {
      title: "Maintenance Requests",
      value: "6",
      description: "Open requests",
      icon: Wrench,
    },
    {
      title: "Occupancy",
      value: "42/45",
      description: "93% occupied",
      icon: Users,
    },
  ]

  return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Caretaker Dashboard</h2>
          <p className="text-muted-foreground">
            Property oversight and maintenance
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
            <CardTitle>Today's Tasks</CardTitle>
            <CardDescription>Your daily responsibilities</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No tasks scheduled
            </p>
          </CardContent>
        </Card>
      </div>
  )
}
