import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.userId as string;
    const companyId = payload.companyId as string | null;

    console.log("📊 Fetching dashboard stats for user:", userId);
    console.log("🏢 Company ID:", companyId);

    // Get user details
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        companies: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build filter based on company
    const companyFilter = companyId ? { companyId } : {};

    // Get statistics filtered by company
    const [
      totalProperties,
      totalUnits,
      occupiedUnits,
      totalTenants,
      pendingPayments,
      completedPayments,
      pendingMaintenance,
    ] = await Promise.all([
      prisma.properties.count({
        where: { ...companyFilter, deletedAt: null },
      }),
      prisma.units.count({
        where: {
          properties: companyId ? { companyId } : {},
          deletedAt: null,
        },
      }),
      prisma.units.count({
        where: {
          properties: companyId ? { companyId } : {},
          status: "OCCUPIED",
          deletedAt: null,
        },
      }),
      prisma.tenants.count({
        where: companyId
          ? {
              units: {
                properties: { companyId },
              },
            }
          : {},
      }),
      prisma.payments.count({
        where: {
          status: "PENDING",
          units: companyId
            ? {
                properties: { companyId },
              }
            : {},
        },
      }),
      prisma.payments.count({
        where: {
          status: "COMPLETED",
          units: companyId
            ? {
                properties: { companyId },
              }
            : {},
        },
      }),
      prisma.maintenance_requests.count({
        where: {
          status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
          units: companyId
            ? {
                properties: { companyId },
              }
            : {},
        },
      }),
    ]);

    // Calculate revenue (sum of completed payments)
    const revenueData = await prisma.payments.aggregate({
      where: {
        status: "COMPLETED",
        units: companyId
          ? {
              properties: { companyId },
            }
          : {},
      },
      _sum: {
        amount: true,
      },
    });

    const totalRevenue = revenueData._sum.amount || 0;
    const occupancyRate =
      totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : "0";

    const stats = {
      companyName: user.companies?.name || "Admin Dashboard",
      companyId: companyId,
      totalProperties,
      totalUnits,
      occupiedUnits,
      vacantUnits: totalUnits - occupiedUnits,
      occupancyRate: parseFloat(occupancyRate),
      totalTenants,
      totalRevenue,
      pendingPayments,
      completedPayments,
      pendingMaintenance,
    };

    console.log("✅ Stats fetched successfully");

    return NextResponse.json(stats);
  } catch (error) {
    console.error("❌ Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}