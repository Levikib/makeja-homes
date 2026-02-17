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
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json({ error: "Property ID required" }, { status: 400 });
    }

    // Fetch property utility settings (from properties table or utility_settings if exists)
    const property = await prisma.properties.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        name: true,
        waterRatePerUnit: true,
        garbageFeeDefault: true,
      },
    });

    return NextResponse.json({
      success: true,
      settings: property || { waterRatePerUnit: 50, garbageFeeDefault: 500 },
    });
  } catch (error: any) {
    console.error("❌ Error fetching utility settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { propertyId, waterRatePerUnit, garbageFeeDefault } = body;

    if (!propertyId) {
      return NextResponse.json({ error: "Property ID required" }, { status: 400 });
    }

    // Update property utility settings
    const updated = await prisma.properties.update({
      where: { id: propertyId },
      data: {
        waterRatePerUnit: waterRatePerUnit || 50,
        garbageFeeDefault: garbageFeeDefault || 500,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Utility settings updated successfully",
      settings: updated,
    });
  } catch (error: any) {
    console.error("❌ Error updating utility settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
