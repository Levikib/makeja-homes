import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const propertyId = searchParams.get("propertyId");
    const includeVacantOnly = searchParams.get("vacantOnly") === "true";

    const where: any = {
      deletedAt: null,
    };

    // Filter by status
    if (status && status !== "all") {
      where.status = status;
    }

    // Filter by property
    if (propertyId) {
      where.propertyId = propertyId;
    }

    const units = await prisma.unit.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
        tenant: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { property: { name: "asc" } },
        { unitNumber: "asc" },
      ],
    });

    return NextResponse.json(units);
  } catch (error: any) {
    console.error("Error fetching units:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch units" },
      { status: error.status || 500 }
    );
  }
}
