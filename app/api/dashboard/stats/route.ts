import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Active properties only
    const totalProperties = await prisma.properties.count({
      where: { deletedAt: null },
    });

    // Active units only
    const totalUnits = await prisma.units.count({
      where: { deletedAt: null },
    });

    const occupiedUnits = await prisma.units.count({
      where: {
        status: "OCCUPIED",
        deletedAt: null,
      },
    });

    const vacantUnits = await prisma.units.count({
      where: {
        status: "VACANT",
        deletedAt: null,
      },
    });

    // Active tenants only (isActive = true)
    const totalTenants = await prisma.users.count({
      where: {
        role: "TENANT",
        isActive: true,
      },
    });

    // Active leases only
    const activeLeases = await prisma.lease_agreements.count({
      where: {
        status: "ACTIVE",
      },
    });

    // Revenue from active (occupied) units only
    const revenue = await prisma.units.aggregate({
      where: {
        status: "OCCUPIED",
        deletedAt: null,
      },
      _sum: {
        rentAmount: true,
      },
    });

    const totalRevenue = revenue._sum.rentAmount || 0;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    return NextResponse.json({
      totalProperties,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      totalTenants,
      activeLeases,
      totalRevenue,
      occupancyRate,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
