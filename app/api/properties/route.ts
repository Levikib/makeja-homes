import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) throw new Error("Unauthorized");
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload;
}

export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    if (!["ADMIN", "MANAGER", "CARETAKER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const properties = await prisma.properties.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(properties);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    if (!["ADMIN", "MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const userId = payload.id as string;
    const data = await request.json();

    if (!data.name?.trim() || !data.address?.trim() || !data.city?.trim() || !data.country?.trim()) {
      return NextResponse.json({ error: "Name, address, city and country are required" }, { status: 400 });
    }

    const property = await prisma.properties.create({
      data: {
        id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name.trim(),
        address: data.address.trim(),
        city: data.city.trim(),
        state: data.state || null,
        country: data.country.trim(),
        postalCode: data.postalCode || null,
        type: data.type || "RESIDENTIAL",
        description: data.description || null,
        managerIds: Array.isArray(data.managerIds) ? data.managerIds : [],
        caretakerIds: Array.isArray(data.caretakerIds) ? data.caretakerIds : [],
        storekeeperIds: Array.isArray(data.storekeeperIds) ? data.storekeeperIds : [],
        createdById: userId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating property:", error);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}
