import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { unitId, title, description, category, priority, estimatedCost, createdById } = body;

    // Validate required fields
    if (!unitId || !title || !description || !category || !priority) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create maintenance request
    const maintenanceRequest = await prisma.maintenance_requests.create({
      data: {
        id: crypto.randomUUID(),
        unitId,
        title,
        description,
        category,
        priority,
        status: "OPEN",
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
        createdById,
      },
    });

    return NextResponse.json(maintenanceRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating maintenance request:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
