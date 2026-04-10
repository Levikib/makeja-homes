import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

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

    const db = getPrismaForRequest(request);

    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT id, name, "waterRatePerUnit", "defaultGarbageFee"
      FROM properties WHERE id = $1 LIMIT 1
    `, propertyId);

    const settings = rows.length > 0 ? rows[0] : { waterRatePerUnit: 50, defaultGarbageFee: 500 };

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("❌ Error fetching utility settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
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
    const { propertyId, waterRatePerUnit, defaultGarbageFee } = body;

    if (!propertyId) {
      return NextResponse.json({ error: "Property ID required" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    await db.$executeRawUnsafe(`
      UPDATE properties
      SET "waterRatePerUnit" = $1, "defaultGarbageFee" = $2, "updatedAt" = $3
      WHERE id = $4
    `, waterRatePerUnit || 50, defaultGarbageFee || 500, new Date(), propertyId);

    return NextResponse.json({
      success: true,
      message: "Utility settings updated successfully",
      settings: { propertyId, waterRatePerUnit: waterRatePerUnit || 50, defaultGarbageFee: defaultGarbageFee || 500 },
    });
  } catch (error: any) {
    console.error("❌ Error updating utility settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
