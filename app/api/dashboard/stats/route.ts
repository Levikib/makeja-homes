import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = currentUser.id;
    const companyId = (currentUser as any).companyId || null;

    console.log("📊 Fetching dashboard stats for user:", userId);
    console.log("🏢 Company ID:", companyId);

    // Get user details
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build filter based on company (if collaborator's feature is active)
    const companyFilter = companyId ? { companyId } : {};

    // Get statistics
    const [
      totalProperties,
      totalUnits,
      totalTenants,
      occupiedUnits,
    ] = await Promise.all([
      prisma.properties.count({
        where: {
          deletedAt: null,
          ...companyFilter,
        },
      }),
      prisma.units.count({
        where: {
          deletedAt: null,
          properties: companyFilter,
        },
      }),
      prisma.users.count({
        where: {
          role: "TENANT",
          isActive: true,
          ...companyFilter,
        },
      }),
      prisma.units.count({
        where: {
          status: "OCCUPIED",
          deletedAt: null,
          properties: companyFilter,
        },
      }),
    ]);

    // Calculate occupancy rate
    const occupancyRate = totalUnits > 0 
      ? Math.round((occupiedUnits / totalUnits) * 100) 
      : 0;

    // Calculate total revenue from occupied units
    const occupiedUnitsWithRent = await prisma.units.findMany({
      where: {
        status: "OCCUPIED",
        deletedAt: null,
        properties: companyFilter,
      },
      include: {
        tenants: {
          where: {
            leaseEndDate: {
              gte: new Date(),
            },
          },
          take: 1,
        },
      },
    });

    const totalRevenue = occupiedUnitsWithRent.reduce((sum, unit) => {
      if (unit.tenants && unit.tenants.length > 0) {
        return sum + Number(unit.tenants[0].rentAmount || 0);
      }
      return sum;
    }, 0);

    console.log("✅ Stats calculated:", {
      totalProperties,
      totalUnits,
      totalTenants,
      occupancyRate,
      totalRevenue,
    });

    return NextResponse.json({
      totalProperties,
      totalUnits,
      totalTenants,
      occupancyRate,
      totalRevenue,
    });
  } catch (error: any) {
    console.error("❌ Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats", details: error.message },
      { status: 500 }
    );
  }
}
