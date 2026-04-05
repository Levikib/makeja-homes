import { NextRequest, NextResponse } from "next/server";
import { getPrismaForTenant } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["ADMIN", "MANAGER", "CARETAKER", "TENANT"]);

    const maintenanceReq = await getPrismaForTenant(req).maintenance_requests.findUnique({
      where: { id: params.id },
      include: {
        units: {
          include: {
            properties: true,
            tenants: {
              include: {
                users: true,
              },
            },
          },
        },
        users_maintenance_requests_createdByIdTousers: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        users_maintenance_requests_assignedToIdTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    if (!maintenanceReq) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(maintenanceReq);
  } catch (error: any) {
    console.error("Error fetching maintenance request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch maintenance request" },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireRole(["ADMIN", "MANAGER", "CARETAKER"]);

    const body = await req.json();
    const {
      title,
      description,
      priority,
      category,
      status,
      assignedToId,
      estimatedCost,
      actualCost,
      completionNotes,
    } = body;

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (estimatedCost !== undefined)
      updateData.estimatedCost = estimatedCost ? parseFloat(estimatedCost) : null;
    if (actualCost !== undefined)
      updateData.actualCost = actualCost ? parseFloat(actualCost) : null;
    if (completionNotes !== undefined)
      updateData.completionNotes = completionNotes;

    // Set completion date if status is COMPLETED
    if (status === "COMPLETED" && !updateData.completedAt) {
      updateData.completedAt = new Date();
    }

    const maintenanceReq = await getPrismaForTenant(req).maintenance_requests.update({
      where: { id: params.id },
      data: updateData,
      include: {
        units: {
          include: {
            properties: true,
          },
        },
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
        details: `Updated maintenance request: ${maintenanceReq.title}`,
      },
    });

    return NextResponse.json(maintenanceReq);
  } catch (error: any) {
    console.error("Error updating maintenance request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update maintenance request" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireRole(["ADMIN"]);

    const maintenanceReq = await getPrismaForTenant(req).maintenance_requests.findUnique({
      where: { id: params.id },
    });

    if (!maintenanceReq) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    await getPrismaForTenant(req).maintenance_requests.delete({
      where: { id: params.id },
    });

    // Log activity
    await getPrismaForTenant(req).activity_logs.create({
      data: {
        id: crypto.randomUUID(),
        userId: currentUser!.id,
        action: "DELETE",
        entityType: "MaintenanceRequest",
        entityId: params.id,
        details: `Deleted maintenance request: ${maintenanceReq.title}`,
      },
    });

    return NextResponse.json({ message: "Request deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting maintenance request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete maintenance request" },
      { status: 500 }
    );
  }
}
