import { NextRequest, NextResponse } from "next/server";
import { getPrismaForTenant } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const now = new Date();

    await getPrismaForTenant(request).$transaction(async (tx) => {
      // 1. Archive the property
      await tx.properties.update({
        where: { id: params.id },
        data: {
          deletedAt: now,
          updatedAt: now,
        },
      });

      // 2. Get all units
      const units = await tx.units.findMany({
        where: { propertyId: params.id },
        select: { id: true },
      });

      const unitIds = units.map((u) => u.id);

      // 3. Terminate active leases FIRST
      if (unitIds.length > 0) {
        await tx.lease_agreements.updateMany({
          where: {
            unitId: { in: unitIds },
            status: "ACTIVE",
          },
          data: {
            status: "TERMINATED",
            updatedAt: now,
          },
        });
      }

      // 4. Change all OCCUPIED units to VACANT (since leases terminated)
      await tx.units.updateMany({
        where: {
          propertyId: params.id,
          status: "OCCUPIED",
        },
        data: {
          status: "VACANT",
          updatedAt: now,
        },
      });

      // 5. Archive all units
      await tx.units.updateMany({
        where: {
          propertyId: params.id,
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          updatedAt: now,
        },
      });

      // 6. Get all tenants for these units
      const tenants = await tx.tenants.findMany({
        where: {
          units: {
            propertyId: params.id,
          },
        },
        select: { userId: true },
      });

      const userIds = tenants.map((t) => t.userId);

      // 7. Mark tenant users as INACTIVE
      if (userIds.length > 0) {
        await tx.users.updateMany({
          where: {
            id: { in: userIds },
            role: "TENANT",
          },
          data: {
            isActive: false,
            updatedAt: now,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Property archived. All leases terminated, units vacant, tenants inactive.",
    });
  } catch (error) {
    console.error("Error archiving property:", error);
    return NextResponse.json(
      { error: "Failed to archive property" },
      { status: 500 }
    );
  }
}
