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
    const { moveOutDate, reason } = body;

    if (!moveOutDate) {
      return NextResponse.json(
        { error: "Move-out date is required" },
        { status: 400 }
      );
    }

    // Get tenant with unit info
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        unit: true,
        leases: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    if (tenant.moveOutDate) {
      return NextResponse.json(
        { error: "Tenant has already moved out" },
        { status: 400 }
      );
    }

    // Start transaction to ensure all updates happen atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update tenant with move-out date
      const updatedTenant = await tx.tenant.update({
        where: { id: params.id },
        data: {
          moveOutDate: new Date(moveOutDate),
        },
      });

      // 2. If tenant has a unit, reset it to VACANT
      if (tenant.unitId) {
        await tx.unit.update({
          where: { id: tenant.unitId },
          data: {
            status: "VACANT",
            tenantId: null,
          },
        });
      }

      // 3. Terminate all active leases
      if (tenant.leases.length > 0) {
        await tx.lease.updateMany({
          where: {
            id: { in: tenant.leases.map((l) => l.id) },
            status: "ACTIVE",
          },
          data: {
            status: "TERMINATED",
            terminationDate: new Date(moveOutDate),
            terminationReason: reason || "Tenant moved out",
          },
        });
      }

      // 4. Log activity
      await tx.activityLog.create({
        data: {
          userId: currentUser.id,
          action: "UPDATE",
          entityType: "Tenant",
          entityId: tenant.id,
          details: `Tenant moved out: ${tenant.user.firstName} ${tenant.user.lastName} from unit ${tenant.unit?.unitNumber || "N/A"}`,
        },
      });

      return updatedTenant;
    });

    return NextResponse.json({
      message: "Tenant successfully moved out",
      tenant: result,
    });
  } catch (error: any) {
    console.error("Error processing move-out:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process move-out" },
      { status: 500 }
    );
  }
}
