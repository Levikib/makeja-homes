import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireRole(["ADMIN", "MANAGER"]);

    const body = await req.json();
    const { assignedToId } = body;

    if (!assignedToId) {
      return NextResponse.json(
        { error: "Assigned user ID is required" },
        { status: 400 }
      );
    }

    const request = await prisma.maintenanceRequest.update({
      where: { id: params.id },
      data: {
        assignedToId,
        status: "ASSIGNED",
      },
      include: {
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        action: "UPDATE",
        entityType: "MaintenanceRequest",
        entityId: request.id,
        details: `Assigned maintenance request to ${request.assignedTo?.firstName} ${request.assignedTo?.lastName}`,
      },
    });

    return NextResponse.json(request);
  } catch (error: any) {
    console.error("Error assigning maintenance request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign maintenance request" },
      { status: 500 }
    );
  }
}
