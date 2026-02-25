import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// POST /api/maintenance/[id]/approve - Approve a maintenance request
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);

    // Check if request exists
    const existingRequest = await prisma.maintenance_requests.findFirst({
      where: {
        id: params.id,
      },
      include: {
        units: {
          include: {
            properties: true,
          },
        },
      },
    });

    if (!existingRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "Maintenance request not found",
        },
        { status: 404 }
      );
    }

    // Check if already approved
    if (existingRequest.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot approve request with status: ${existingRequest.status}`,
        },
        { status: 400 }
      );
    }

    // Approve the request by changing status to ASSIGNED
    const request = await prisma.maintenance_requests.update({
      where: {
        id: params.id,
      },
      data: {
        status: "ASSIGNED",
      },
      include: {
        units: {
          include: {
            properties: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log the activity
    await prisma.activity_logs.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        action: "UPDATE",
        entityType: "RenovationRequest",
        entityId: request.id,
        details: `Approved maintenance request: ${request.title} for unit ${request.unit.unitNumber}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: request,
      message: "Maintenance request approved successfully",
    });
  } catch (error: any) {
    console.error("Error approving maintenance request:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to approve maintenance request",
      },
      { status: error.status || 500 }
    );
  }
}
