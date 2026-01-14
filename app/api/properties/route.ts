import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token and extract user info
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.userId as string;
    const companyId = payload.companyId as string | null;

    console.log("🏢 Creating property for user:", userId);
    console.log("🏢 Company ID:", companyId);

    // Get request body
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.address || !body.city || !body.country) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate property ID
    const propertyId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("📝 Property data:", {
      id: propertyId,
      name: body.name,
      createdById: userId,
      companyId: companyId,
    });

    // Create property
    const property = await prisma.properties.create({
      data: {
        id: propertyId,
        name: body.name,
        address: body.address,
        city: body.city,
        state: body.state || null,
        country: body.country,
        postalCode: body.postalCode || null,
        description: body.description || null,
        type: body.type || "RESIDENTIAL",
        createdById: userId, // ✅ Use userId from JWT
        companyId: companyId, // ✅ Link to company
        managerId: body.managerId || null,
        caretakerId: body.caretakerId || null,
        updatedAt: new Date(),
      },
    });

    console.log("✅ Property created:", property.id, property.name);

    return NextResponse.json({
      success: true,
      property,
    });
  } catch (error: any) {
    console.error("Error creating property:", error);
    console.error("Error code:", error.code);
    console.error("Error meta:", error.meta);
    
    return NextResponse.json(
      { error: `Failed to create property: ${error.message}` },
      { status: 500 }
    );
  }
}

// GET handler for listing properties
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const companyId = payload.companyId as string | null;

    console.log("📋 Fetching properties for company:", companyId);

    // Build filter - only show properties from user's company
    const where: any = {
      deletedAt: null,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    const properties = await prisma.properties.findMany({
      where,
      include: {
        users_properties_createdByIdTousers: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        units: {
          where: { deletedAt: null },
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`✅ Found ${properties.length} properties`);

    return NextResponse.json({ properties });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}