import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

// POST /api/maintenance/[id]/reject - Reject a maintenance request
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"]);

    const body = await req.json();
    const { reason } = rejectSchema.parse(body);

    // Check if request exists
    const existingRequest = await prisma.maintenanceRequest.findFirst({
      where: {
        id: params.id,
      },
      include: {
        unit: {
          include: {
            property: true,
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

    // Check if can be rejected
    if (existingRequest.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot reject request with status: ${existingRequest.status}`,
        },
        { status: 400 }
      );
    }

    // Reject the request
    const request = await prisma.maintenanceRequest.update({
      where: {
        id: params.id,
      },
      data: {
        status: "CANCELLED",
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        action: "UPDATE",
        entityType: "RenovationRequest",
        entityId: request.id,
        details: `Rejected maintenance request: ${request.title}. Reason: ${reason}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: request,
      message: "Maintenance request rejected",
    });
  } catch (error: any) {
    console.error("Error rejecting maintenance request:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to reject maintenance request",
      },
      { status: error.status || 500 }
    );
  }
}
