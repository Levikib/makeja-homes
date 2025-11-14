import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [properties, units, tenants] = await Promise.all([
      prisma.property.count({ where: { deletedAt: null } }),
      prisma.unit.findMany({ where: { deletedAt: null } }),
      prisma.tenant.count({ where: { moveOutDate: null } }),
    ]);

    const occupiedUnits = units.filter((u) => u.status === "OCCUPIED").length;
    const vacantUnits = units.filter((u) => u.status === "VACANT").length;
    const occupancyRate = units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0;

    const totalRevenue = units
      .filter((u) => u.status === "OCCUPIED" && u.rentAmount)
      .reduce((sum, u) => sum + Number(u.rentAmount), 0);

    return NextResponse.json({
      properties,
      units: units.length,
      tenants,
      occupiedUnits,
      vacantUnits,
      occupancyRate,
      totalRevenue,
      userName: session.user.name || session.user.email?.split('@')[0] || 'User',
    });
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
