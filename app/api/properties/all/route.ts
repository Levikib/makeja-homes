import { NextRequest, NextResponse } from "next/server";
import { getPrismaForTenant } from "@/lib/prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    const properties = await getPrismaForTenant(request).properties.findMany({
      where: includeArchived ? {} : { deletedAt: null }, // Exclude archived by default
      include: {
        units: {
          select: {
            id: true,
            unitNumber: true,
            status: true,
          },
        },
        _count: {
          select: {
            units: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ properties });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}
