import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
 process.env.JWT_SECRET || "your-secret-key-min-32-characters-long"
);

export async function GET() {
  try {
    const properties = await prisma.properties.findMany({
      orderBy: { name: "asc" }
    });
    return NextResponse.json(properties);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token and get user ID
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const data = await request.json();
    
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
        managerIds: Array.isArray(data.managerIds) ? data.managerIds : [],
        caretakerIds: Array.isArray(data.caretakerIds) ? data.caretakerIds : [],
        storekeeperIds: Array.isArray(data.storekeeperIds) ? data.storekeeperIds : [],
        createdById: userId,
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json(property);
  } catch (error) {
    console.error("Error creating property:", error);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}
