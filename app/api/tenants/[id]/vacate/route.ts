import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest, resolveSchema } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    if (!["ADMIN", "MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const db = getPrismaForRequest(request);
    const schema = resolveSchema(request);
    const today = new Date();

    const tenants = await db.$queryRawUnsafe<any[]>(
      `SELECT id, "unitId", "userId" FROM tenants WHERE id = $1 LIMIT 1`, params.id
    );
    if (!tenants.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenant = tenants[0];

    // Update tenant lease end date
    await db.$executeRawUnsafe(
      `UPDATE tenants SET "leaseEndDate" = $2, "updatedAt" = $2 WHERE id = $1`,
      params.id, today
    );

    // Terminate active leases
    await db.$executeRawUnsafe(
      `UPDATE lease_agreements SET status = 'TERMINATED'::${schema}."LeaseStatus", "endDate" = $2, "updatedAt" = $2
       WHERE "tenantId" = $1 AND status != 'TERMINATED'::${schema}."LeaseStatus"`,
      params.id, today
    );

    // Mark user inactive
    await db.$executeRawUnsafe(
      `UPDATE users SET "isActive" = false, "updatedAt" = $2 WHERE id = $1`,
      tenant.userId, today
    );

    // Set unit to VACANT
    if (tenant.unitId) {
      await db.$executeRawUnsafe(
        `UPDATE units SET status = 'VACANT'::${schema}."UnitStatus", "updatedAt" = $2 WHERE id = $1`,
        tenant.unitId, today
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tenant vacated successfully. User marked as inactive, unit now vacant, lease terminated.",
      vacateDate: today,
    });
  } catch (error: any) {
    console.error("Vacate error:", error);
    return NextResponse.json({ error: "Failed to vacate tenant", details: error.message }, { status: 500 });
  }
}
