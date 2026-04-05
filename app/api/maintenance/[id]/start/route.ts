import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { getPrismaForTenant } from "@/lib/prisma";

// POST /api/maintenance/[id]/start - Start work on maintenance request
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER", "TECHNICAL"]);

    // Check if request exists
    const existingRequest = await getPrismaForTenant(req).maintenance_requests.findFirst({
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

    // Check if approved
    if (existingRequest.status !== "ASSIGNED") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot start work on request with status: ${existingRequest.status}. Request must be approved first.`,
        },
        { status: 400 }
      );
    }

    // Start the work
    const maintenanceReq = await getPrismaForTenant(req).maintenance_requests.update({
      where: {
        id: params.id,
      },
      data: {
        status: "IN_PROGRESS",
      },
      include: {
        units: {
          include: {
            properties: true,
          },
        },
      },
    });

    // Log the activity
    await getPrismaForTenant(req).activity_logs.create({
      data: {
        id: crypto.randomUUID(),
        userId: user!.id,
        action: "UPDATE",
        entityType: "RenovationRequest",
        entityId: maintenanceReq.id,
        details: `Started work on maintenance request: ${maintenanceReq.title} for unit ${maintenanceReq.units.unitNumber}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: maintenanceReq,
      message: "Work started on maintenance request",
    });
  } catch (error: any) {
    console.error("Error starting maintenance request:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to start maintenance request",
      },
      { status: error.status || 500 }
    );
  }
}
