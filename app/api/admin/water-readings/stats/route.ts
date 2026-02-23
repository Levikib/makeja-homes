import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);

    const { searchParams } = new URL(request.url);
    const property = searchParams.get("property") || "all";
    const month = searchParams.get("month") || "all";
    const year = searchParams.get("year");

    const where: any = {};

    if (month !== "all") {
      where.month = parseInt(month);
    }

    if (year) {
      where.year = parseInt(year);
    }

    if (property !== "all") {
      where.units = {
        properties: {
          name: property,
        },
      };
    }

    const readings = await prisma.water_readings.findMany({
      where,
      include: {
        tenants: {
          include: {
            users: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const totalReadings = readings.length;
    const totalConsumption = readings.reduce((sum, r) => sum + r.unitsConsumed, 0);
    const totalRevenue = readings.reduce((sum, r) => sum + r.amountDue, 0);
    const averageConsumption = totalReadings > 0 ? totalConsumption / totalReadings : 0;

    let highestConsumer = null;
    if (readings.length > 0) {
      const sorted = [...readings].sort((a, b) => b.unitsConsumed - a.unitsConsumed);
      const highest = sorted[0];
      highestConsumer = {
        tenant: `${highest.tenants.users.firstName} ${highest.tenants.users.lastName}`,
        consumption: highest.unitsConsumed,
      };
    }

    return NextResponse.json({
      stats: {
        totalReadings,
        totalConsumption,
        totalRevenue,
        averageConsumption,
        highestConsumer,
      },
    });
  } catch (error: any) {
    console.error("Error fetching water stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
