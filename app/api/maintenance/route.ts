import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN", "MANAGER", "TECHNICAL", "CARETAKER"]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const unitId = searchParams.get("unitId");

    const where: any = {
      deletedAt: null,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (unitId) {
      where.unitId = unitId;
    }

    const requests = await prisma.renovationRequest.findMany({
      where,
      include: {
        unit: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        tenant: true,
      },
      orderBy: [
        { priority: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error("Error fetching renovation requests:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch renovation requests" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER", "TECHNICAL", "TENANT"]);

    const body = await req.json();
    const {
      unitId,
      title,
      description,
      priority = 2,
      estimatedCost,
    } = body;

    if (!unitId || !title || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const requestNumber = `RR-${Date.now()}`;

    const request = await prisma.renovationRequest.create({
      data: {
        requestNumber,
        unitId,
        title,
        description,
        priority,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
        requestedById: user.id,
        status: "PENDING",
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        requestedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entityType: "RenovationRequest",
        entityId: request.id,
        details: `Created renovation request: ${title}`,
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error: any) {
    console.error("Error creating renovation request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create renovation request" },
      { status: 500 }
    );
  }
}
