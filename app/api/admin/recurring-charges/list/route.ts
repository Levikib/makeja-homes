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
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (role !== "ADMIN" && role !== "MANAGER" && role !== "CARETAKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const isActive = searchParams.get("isActive");

    // Build where clause
    const where: any = {};

    if (propertyId && propertyId !== "all") {
      where.propertyIds = {
        has: propertyId,
      };
    }

    if (isActive && isActive !== "all") {
      where.isActive = isActive === "true";
    }

    // Fetch recurring charges
    const charges = await prisma.recurringCharges.findMany({
      where,
      include: {
        users: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch property names for all charges
    const chargesWithProperties = await Promise.all(
      charges.map(async (charge) => {
        const properties = await prisma.properties.findMany({
          where: {
            id: {
              in: charge.propertyIds,
            },
          },
          select: {
            id: true,
            name: true,
          },
        });

        return {
          ...charge,
          properties: properties,
        };
      })
    );

    return NextResponse.json({ charges: chargesWithProperties });
  } catch (error: any) {
    console.error("❌ Error fetching recurring charges:", error);
    return NextResponse.json(
      { error: "Failed to fetch recurring charges" },
      { status: 500 }
    );
  }
}
