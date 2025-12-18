import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tenants = await prisma.tenants.findMany({
      where: {
        users: {
          isActive: true, // Only show active tenants
        },
      },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            isActive: true,
          },
        },
        units: {
          select: {
            id: true,
            unitNumber: true,
            properties: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}
