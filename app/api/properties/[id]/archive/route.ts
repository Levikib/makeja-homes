import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getPrismaForRequest(request);
    const now = new Date();

    // 1. Archive the property
    await db.$executeRawUnsafe(
      `UPDATE properties SET "deletedAt" = $2, "updatedAt" = $2 WHERE id = $1`,
      params.id, now
    );

    // 2. Get all unit IDs
    const units = await db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM units WHERE "propertyId" = $1`, params.id
    );
    const unitIds = units.map(u => u.id);

    if (unitIds.length > 0) {
      // 3. Terminate active leases
      await db.$executeRawUnsafe(
        `UPDATE lease_agreements SET status = 'TERMINATED'::public."LeaseStatus", "updatedAt" = $2
         WHERE "unitId" = ANY($1::text[]) AND status = 'ACTIVE'::public."LeaseStatus"`,
        unitIds, now
      );

      // 4. Set OCCUPIED units to VACANT
      await db.$executeRawUnsafe(
        `UPDATE units SET status = 'VACANT'::public."UnitStatus", "updatedAt" = $2
         WHERE "propertyId" = $1 AND status = 'OCCUPIED'::public."UnitStatus"`,
        params.id, now
      );

      // 5. Archive all units
      await db.$executeRawUnsafe(
        `UPDATE units SET "deletedAt" = $2, "updatedAt" = $2
         WHERE "propertyId" = $1 AND "deletedAt" IS NULL`,
        params.id, now
      );

      // 6. Get tenant user IDs
      const tenants = await db.$queryRawUnsafe<{ userId: string }[]>(
        `SELECT t."userId" FROM tenants t WHERE t."unitId" = ANY($1::text[])`,
        unitIds
      );
      const userIds = tenants.map(t => t.userId);

      // 7. Mark tenant users as inactive
      if (userIds.length > 0) {
        await db.$executeRawUnsafe(
          `UPDATE users SET "isActive" = false, "updatedAt" = $2
           WHERE id = ANY($1::text[]) AND role = 'TENANT'::public."Role"`,
          userIds, now
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Property archived. All leases terminated, units vacant, tenants inactive.",
    });
  } catch (error) {
    console.error("Error archiving property:", error);
    return NextResponse.json({ error: "Failed to archive property" }, { status: 500 });
  }
}
