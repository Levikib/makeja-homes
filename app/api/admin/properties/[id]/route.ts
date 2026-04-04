import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ FIXED: Use JWT_SECRET (same as middleware)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string; // ✅ FIXED: Changed from payload.userId
    const role = payload.role as string;

    const propertyId = params.id;

    console.log("🏢 Fetching property:", propertyId);

    // Fetch property
    const property = await prisma.properties.findFirst({
      where: {
        id: propertyId,
        ...(role !== "ADMIN" ? { createdById: userId } : {}),
      },
      include: {
        units: {
          select: {
            id: true,
            unitNumber: true,
            type: true,
            status: true,
            rentAmount: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    console.log("✅ Property found:", property.name);

    return NextResponse.json({ property });
  } catch (error: any) {
    console.error("❌ Error fetching property:", error);
    return NextResponse.json(
      { error: "Failed to fetch property" },
      { status: 500 }
    );
  }
}
