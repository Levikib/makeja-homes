import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET all units with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const units = await prisma.units.findMany({
      where,
      include: {
        properties: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: [
        { properties: { name: "asc" } },
        { unitNumber: "asc" },
      ],
    });

    // Return in the format the component expects
    return NextResponse.json({
      units,
      total: units.length,
    });
  } catch (error) {
    console.error("Error fetching units:", error);
    return NextResponse.json(
      { error: "Failed to fetch units" },
      { status: 500 }
    );
  }
}

// POST create new unit
export async function POST(request: Request) {
  return NextResponse.json(
    { error: "Use property-specific endpoint to create units" },
    { status: 400 }
  );
}
