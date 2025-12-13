import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const propertyId = searchParams.get("propertyId");

    const where: any = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (propertyId) {
      where.units = {
        propertyId: propertyId,
      };
    }

    const leases = await prisma.lease_agreements.findMany({
      where,
      include: {
        units: {
          include: {
            properties: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        tenants: {
          include: {
            users: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    // Map to frontend format
    const formattedLeases = leases.map((lease) => ({
      id: lease.id,
      tenantId: lease.tenantId,
      unitId: lease.unitId,
      status: lease.status,
      startDate: lease.startDate,
      endDate: lease.endDate,
      monthlyRent: lease.rentAmount,
      rentAmount: lease.rentAmount,
      depositAmount: lease.depositAmount,
      terms: lease.terms,
      createdAt: lease.createdAt,
      updatedAt: lease.updatedAt,
      unit: {
        ...lease.units,
        property: lease.units.properties,
      },
      tenant: {
        ...lease.tenants,
        user: lease.tenants.users,
      },
    }));

    return NextResponse.json(formattedLeases);
  } catch (error) {
    console.error("Error fetching leases:", error);
    return NextResponse.json(
      { error: "Failed to fetch leases", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
