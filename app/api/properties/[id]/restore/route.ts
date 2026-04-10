import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { getCurrentUserFromRequest } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const caller = await getCurrentUserFromRequest(request)
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const db = getPrismaForRequest(request);
    const now = new Date();

    // 1. Restore the property
    await db.$executeRawUnsafe(
      `UPDATE properties SET "deletedAt" = NULL, "updatedAt" = $2 WHERE id = $1`,
      params.id, now
    );

    // 2. Restore all archived units
    await db.$executeRawUnsafe(
      `UPDATE units SET "deletedAt" = NULL, "updatedAt" = $2
       WHERE "propertyId" = $1 AND "deletedAt" IS NOT NULL`,
      params.id, now
    );

    // 3. Get all unit IDs
    const units = await db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM units WHERE "propertyId" = $1`, params.id
    );
    const unitIds = units.map(u => u.id);

    if (unitIds.length > 0) {
      // 4. Reactivate terminated leases
      await db.$executeRawUnsafe(
        `UPDATE lease_agreements SET status = 'ACTIVE'::text::"LeaseStatus", "updatedAt" = $2
         WHERE "unitId" = ANY($1::text[]) AND status = 'TERMINATED'::text::"LeaseStatus"`,
        unitIds, now
      );

      // 5. Get tenant user IDs
      const tenants = await db.$queryRawUnsafe<{ userId: string; unitId: string }[]>(
        `SELECT "userId", "unitId" FROM tenants WHERE "unitId" = ANY($1::text[])`,
        unitIds
      );
      const userIds = tenants.map(t => t.userId);
      const occupiedUnitIds = [...new Set(tenants.map(t => t.unitId))];

      // 6. Reactivate tenant users
      if (userIds.length > 0) {
        await db.$executeRawUnsafe(
          `UPDATE users SET "isActive" = true, "updatedAt" = $2
           WHERE id = ANY($1::text[]) AND role = 'TENANT'::text::"Role"`,
          userIds, now
        );
      }

      // 7. Set units with tenants back to OCCUPIED
      if (occupiedUnitIds.length > 0) {
        await db.$executeRawUnsafe(
          `UPDATE units SET status = 'OCCUPIED'::text::"UnitStatus", "updatedAt" = $2
           WHERE id = ANY($1::text[])`,
          occupiedUnitIds, now
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Property restored. Leases reactivated, units updated, tenants active.",
    });
  } catch (error) {
    console.error("Error restoring property:", error);
    return NextResponse.json({ error: "Failed to restore property" }, { status: 500 });
  }
}
