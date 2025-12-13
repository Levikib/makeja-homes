import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get counts using lowercase model names
    const [
      propertiesCount,
      unitsCount,
      tenantsCount,
      maintenanceCount,
      occupiedUnits,
      vacantUnits,
      revenueData
    ] = await Promise.all([
      prisma.properties.count({ where: { deletedAt: null } }),
      prisma.units.count({ where: { deletedAt: null } }),
      prisma.tenants.count(),
      prisma.maintenance_requests.count({
        where: {
          status: { in: ["PENDING", "IN_PROGRESS"] }
        }
      }),
      prisma.units.count({
        where: {
          status: "OCCUPIED",
          deletedAt: null
        }
      }),
      prisma.units.count({
        where: {
          status: "VACANT",
          deletedAt: null
        }
      }),
      prisma.payments.aggregate({
        _sum: {
          amount: true
        }
      })
    ]);

    const occupancyRate = unitsCount > 0
      ? ((occupiedUnits / unitsCount) * 100).toFixed(1)
      : 0;

    const stats = {
      properties: propertiesCount,
      units: unitsCount,
      tenants: tenantsCount,
      maintenance: maintenanceCount,
      occupiedUnits,
      vacantUnits,
      occupancyRate: parseFloat(occupancyRate as string),
      revenue: revenueData._sum.amount || 0
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}
