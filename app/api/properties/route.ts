import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const properties = await prisma.properties.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(properties);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const data = await request.json();
    
    // Use session user ID or fallback to actual admin user
    let createdById = session?.user?.id || "467da134-bc94-44cf-ba46-50a70ac862c3";
    
    const property = await prisma.properties.create({
      data: {
        id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state || null,
        country: data.country,
        postalCode: data.postalCode || null,
        type: data.type || "RESIDENTIAL",
        description: data.description || null,
        createdById: createdById,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(property);
  } catch (error) {
    console.error("Error creating property:", error);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}
