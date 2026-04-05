import { NextRequest, NextResponse } from "next/server";
import { getPrismaForTenant } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
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

    const maintenanceReq = await getPrismaForTenant(req).maintenance_requests.update({
      where: { id: params.id },
      data: {
        assignedToId,
        status: "ASSIGNED",
      },
      include: {
        users_maintenance_requests_assignedToIdTousers: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log activity
    await getPrismaForTenant(req).activity_logs.create({
      data: {
        id: crypto.randomUUID(),
        userId: currentUser!.id,
        action: "UPDATE",
        entityType: "MaintenanceRequest",
        entityId: maintenanceReq.id,
        details: `Assigned maintenance request to ${maintenanceReq.users_maintenance_requests_assignedToIdTousers?.firstName} ${maintenanceReq.users_maintenance_requests_assignedToIdTousers?.lastName}`,
      },
    });

    return NextResponse.json(maintenanceReq);
  } catch (error: any) {
    console.error("Error assigning maintenance request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign maintenance request" },
      { status: 500 }
    );
  }
}
