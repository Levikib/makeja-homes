import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { waterRatePerUnit, defaultGarbageFee } = body;

    if (waterRatePerUnit !== undefined && waterRatePerUnit < 0) {
      return NextResponse.json(
        { error: "Water rate cannot be negative" },
        { status: 400 }
      );
    }

    if (defaultGarbageFee !== undefined && defaultGarbageFee < 0) {
      return NextResponse.json(
        { error: "Garbage fee cannot be negative" },
        { status: 400 }
      );
    }

    const property = await prisma.properties.update({
      where: { id: params.id },
      data: {
        waterRatePerUnit: waterRatePerUnit !== undefined 
          ? parseFloat(waterRatePerUnit) 
          : undefined,
        defaultGarbageFee: defaultGarbageFee !== undefined 
          ? parseFloat(defaultGarbageFee) 
          : undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Property rates updated successfully",
      property: {
        id: property.id,
        name: property.name,
        waterRatePerUnit: property.waterRatePerUnit,
        defaultGarbageFee: property.defaultGarbageFee,
      },
    });
  } catch (error: any) {
    console.error("❌ Error updating property rates:", error);
    return NextResponse.json(
      { error: "Failed to update property rates" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);

    const property = await prisma.properties.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        waterRatePerUnit: true,
        defaultGarbageFee: true,
        chargesGarbageFee: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ property });
  } catch (error: any) {
    console.error("❌ Error fetching property rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch property rates" },
      { status: 500 }
    );
  }
}
