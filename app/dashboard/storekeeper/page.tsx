import { requireRole } from "@/lib/auth-helpers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, AlertTriangle, FileText, TrendingUp } from "lucide-react"

export default async function StorekeeperDashboardPage() {
  const user = await requireRole(["ADMIN", "MANAGER", "STOREKEEPER"])

  const stats = [
    {
      title: "Total Items",
      value: "234",
      description: "In inventory",
      icon: Package,
    },
    {
      title: "Low Stock Items",
      value: "12",
      description: "Need reordering",
      icon: AlertTriangle,
    },
    {
      title: "Pending Orders",
      value: "5",
      description: "Awaiting approval",
      icon: FileText,
    },
    {
      title: "Inventory Value",
      value: "KSh 1,250,000",
      description: "Total stock value",
      icon: TrendingUp,
    },
  ]

  return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Storekeeper Dashboard</h2>
          <p className="text-muted-foreground">
            Inventory and supply management
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
            <CardTitle>Recent Movements</CardTitle>
            <CardDescription>Latest inventory transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent movements
            </p>
          </CardContent>
        </Card>
      </div>
  )
}
