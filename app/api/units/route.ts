import { getPrismaForTenant } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export const dynamic = 'force-dynamic'

// GET all units with optional filters
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    if (!["ADMIN", "MANAGER", "CARETAKER", "STOREKEEPER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const units = await getPrismaForTenant(request).units.findMany({
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
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "Use property-specific endpoint to create units" },
    { status: 400 }
  );
}
