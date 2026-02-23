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
                email: true,
              },
            },
            units: {
              include: {
                properties: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        units: {
          select: {
            unitNumber: true,
          },
        },
      },
      orderBy: {
        readingDate: "desc",
      },
    });

    const formattedReadings = readings.map((r) => ({
      id: r.id,
      previousReading: r.previousReading,
      currentReading: r.currentReading,
      unitsConsumed: r.unitsConsumed,
      ratePerUnit: r.ratePerUnit,
      amountDue: r.amountDue,
      readingDate: r.readingDate,
      month: r.month,
      year: r.year,
      tenant: {
        firstName: r.tenants.users.firstName,
        lastName: r.tenants.users.lastName,
        email: r.tenants.users.email,
      },
      unit: {
        unitNumber: r.units.unitNumber,
      },
      property: {
        name: r.tenants.units.properties.name,
      },
    }));

    return NextResponse.json({ readings: formattedReadings });
  } catch (error: any) {
    console.error("Error fetching water readings:", error);
    return NextResponse.json(
      { error: "Failed to fetch readings" },
      { status: 500 }
    );
  }
}
