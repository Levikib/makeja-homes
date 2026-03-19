import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserFromRequest } from "@/lib/auth-helpers"
import { getPrismaForRequest } from "@/lib/get-prisma"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prisma = getPrismaForRequest(request)
    const companyId = (currentUser as any).companyId || null
    const companyFilter = companyId ? { companyId } : {}

    const [totalProperties, totalUnits, totalTenants, occupiedUnits] = await Promise.all([
      prisma.properties.count({ where: { deletedAt: null, ...companyFilter } }),
      prisma.units.count({ where: { deletedAt: null, properties: companyFilter } }),
      prisma.users.count({ where: { role: "TENANT", isActive: true, ...companyFilter } }),
      prisma.units.count({ where: { status: "OCCUPIED", deletedAt: null, properties: companyFilter } }),
    ])

    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

    const occupiedUnitsWithRent = await prisma.units.findMany({
      where: { status: "OCCUPIED", deletedAt: null, properties: companyFilter },
      include: { tenants: { where: { leaseEndDate: { gte: new Date() } }, take: 1 } },
    })

    const totalRevenue = occupiedUnitsWithRent.reduce((sum, unit) => {
      return sum + Number(unit.tenants?.[0]?.rentAmount || 0)
    }, 0)

    return NextResponse.json({ totalProperties, totalUnits, totalTenants, occupancyRate, totalRevenue })

  } catch (error: any) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats", details: error.message }, { status: 500 })
  }
}
