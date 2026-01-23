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
    const companyId = payload.companyId as string | null;

    if (role !== "ADMIN" && role !== "MANAGER" && role !== "CARETAKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Build where clause for company isolation
    const where: any = {
      deletedAt: null,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    // Fetch properties - FIXED to match actual schema
    const properties = await prisma.properties.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        postalCode: true,  // FIXED: was zipCode
        country: true,
        type: true,
        paystackActive: true,
        paystackSubaccountCode: true,
        chargesGarbageFee: true,  // FIXED: removed chargesWater (doesn't exist)
        defaultGarbageFee: true,
        waterRatePerUnit: true,  // Added: this exists in schema
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ properties });
  } catch (error: any) {
    console.error("❌ Error fetching properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}
