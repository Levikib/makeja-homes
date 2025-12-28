import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const properties = await prisma.properties.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        country: true,
        type: true,
        deletedAt: true,
        managerIds: true,
        caretakerIds: true,
        storekeeperIds: true,
        _count: {
          select: {
            units: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ properties });
  } catch (error) {
    console.error("Error fetching all properties:", error);
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
  }
}
