import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Restore the property
      await tx.properties.update({
        where: { id: params.id },
        data: {
          deletedAt: null,
          updatedAt: now,
        },
      });

      // 2. Restore all units
      await tx.units.updateMany({
        where: {
          propertyId: params.id,
          deletedAt: { not: null },
        },
        data: {
          deletedAt: null,
          updatedAt: now,
        },
      });

      // 3. Get units and their tenants
      const units = await tx.units.findMany({
        where: { propertyId: params.id },
        include: {
          tenants: true,
        },
      });

      const unitIds = units.map((u) => u.id);

      // 4. Reactivate terminated leases
      if (unitIds.length > 0) {
        await tx.lease_agreements.updateMany({
          where: {
            unitId: { in: unitIds },
            status: "TERMINATED",
          },
          data: {
            status: "ACTIVE",
            updatedAt: now,
          },
        });
      }

      // 5. Get all tenants
      const tenants = await tx.tenants.findMany({
        where: {
          units: {
            propertyId: params.id,
          },
        },
        select: { userId: true, unitId: true },
      });

      const userIds = tenants.map((t) => t.userId);

      // 6. Reactivate tenant users
      if (userIds.length > 0) {
        await tx.users.updateMany({
          where: {
            id: { in: userIds },
            role: "TENANT",
          },
          data: {
            isActive: true,
            updatedAt: now,
          },
        });
      }

      // 7. Set units with tenants back to OCCUPIED
      for (const unit of units) {
        if (unit.tenants.length > 0) {
          await tx.units.update({
            where: { id: unit.id },
            data: {
              status: "OCCUPIED",
              updatedAt: now,
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Property restored. Leases reactivated, units updated, tenants active.",
    });
  } catch (error) {
    console.error("Error restoring property:", error);
    return NextResponse.json(
      { error: "Failed to restore property" },
      { status: 500 }
    );
  }
}
