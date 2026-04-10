import { jwtVerify } from "jose"
import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
      if (!["ADMIN","MANAGER"].includes(payload.role as string)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const today = new Date();
    const db = getPrismaForRequest(request);

    // Get lease details
    const leaseRows = await db.$queryRawUnsafe<any[]>(`
      SELECT "tenantId", "unitId", status::text AS status
      FROM lease_agreements WHERE id = $1 LIMIT 1
    `, params.id);

    if (leaseRows.length === 0) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }
    const lease = leaseRows[0];

    // Mark lease as TERMINATED
    await db.$executeRawUnsafe(`
      UPDATE lease_agreements
      SET status = 'TERMINATED'::"LeaseStatus", "endDate" = $1, "updatedAt" = $1
      WHERE id = $2
    `, today, params.id);

    // Mark unit as VACANT
    await db.$executeRawUnsafe(`
      UPDATE units SET status = 'VACANT'::"UnitStatus", "updatedAt" = $1 WHERE id = $2
    `, today, lease.unitId);

    // Update tenant lease end date
    await db.$executeRawUnsafe(`
      UPDATE tenants SET "leaseEndDate" = $1, "updatedAt" = $1 WHERE id = $2
    `, today, lease.tenantId);

    return NextResponse.json({
      success: true,
      message: "Lease terminated successfully. Unit marked as vacant."
    });
  } catch (error) {
    console.error("Error terminating lease:", error);
    return NextResponse.json({ error: "Failed to terminate lease" }, { status: 500 });
  }
}
