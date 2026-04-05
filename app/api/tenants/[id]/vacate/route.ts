import { jwtVerify } from "jose"
import { NextRequest, NextResponse } from "next/server";
import { getPrismaForTenant } from "@/lib/prisma";


export const dynamic = 'force-dynamic'
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Auth guard
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


    const tenantId = params.id;
    const today = new Date();

    // Get tenant info
    const tenant = await getPrismaForTenant(request).tenants.findUnique({
      where: { id: tenantId },
      select: { 
        unitId: true,
        userId: true, // Get userId to mark inactive
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    await getPrismaForTenant(request).$transaction(async (tx) => {
      // 1. Update tenant lease end date to today (marking as vacated)
      await tx.tenants.update({
        where: { id: tenantId },
        data: {
          leaseEndDate: today,
        },
      });

      // 2. Update all lease agreements to TERMINATED and set end date to today
      await tx.lease_agreements.updateMany({
        where: {
          tenantId,
          status: { not: "TERMINATED" },
        },
        data: {
          status: "TERMINATED",
          endDate: today,
        },
      });

      // 3. Mark tenant user as INACTIVE
      await tx.users.update({
        where: { id: tenant.userId },
        data: {
          isActive: false,
          updatedAt: today,
        },
      });

      // 4. Update unit status to VACANT
      if (tenant.unitId) {
        await tx.units.update({
          where: { id: tenant.unitId },
          data: { 
            status: "VACANT",
            updatedAt: today,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Tenant vacated successfully. User marked as inactive, unit now vacant, lease terminated.",
      vacateDate: today
    });
  } catch (error: any) {
    console.error("Vacate error:", error);
    return NextResponse.json(
      { error: "Failed to vacate tenant", details: error.message },
      { status: 500 }
    );
  }
}
