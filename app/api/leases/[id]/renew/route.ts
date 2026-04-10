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

    const data = await request.json();
    const { startDate, endDate, rentAmount, depositAmount } = data;
    const today = new Date();

    const db = getPrismaForRequest(request);

    // Get the current lease
    const leaseRows = await db.$queryRawUnsafe<any[]>(`
      SELECT "tenantId", "unitId", terms FROM lease_agreements WHERE id = $1 LIMIT 1
    `, params.id);

    if (leaseRows.length === 0) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }
    const currentLease = leaseRows[0];

    // Mark current lease as EXPIRED
    await db.$executeRawUnsafe(`
      UPDATE lease_agreements
      SET status = 'EXPIRED'::"LeaseStatus", "endDate" = $1, "updatedAt" = $1
      WHERE id = $2
    `, today, params.id);

    // Create new lease
    const newLeaseId = `lease_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.$executeRawUnsafe(`
      INSERT INTO lease_agreements (
        id, "tenantId", "unitId", status, "startDate", "endDate",
        "rentAmount", "depositAmount", terms, "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, 'PENDING'::"LeaseStatus", $4, $5, $6, $7, $8, $9, $9
      )
    `, newLeaseId, currentLease.tenantId, currentLease.unitId,
       new Date(startDate), new Date(endDate),
       parseFloat(rentAmount), parseFloat(depositAmount),
       currentLease.terms, today);

    // Update unit status to RESERVED
    await db.$executeRawUnsafe(`
      UPDATE units SET status = 'RESERVED'::"UnitStatus", "updatedAt" = $1 WHERE id = $2
    `, today, currentLease.unitId);

    return NextResponse.json({
      success: true,
      message: "Lease renewed successfully. Old lease marked as expired with actual end date. New lease created with PENDING status."
    });
  } catch (error) {
    console.error("Error renewing lease:", error);
    return NextResponse.json({ error: "Failed to renew lease" }, { status: 500 });
  }
}
