import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = params.id;
    const today = new Date();

    // Get tenant info
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { unitId: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Update tenant lease end date to today (marking as vacated)
    await prisma.tenants.update({
      where: { id: tenantId },
      data: {
        leaseEndDate: today, // Set lease end to today
      },
    });

    // Update all lease agreements to TERMINATED and set end date to today
    await prisma.lease_agreements.updateMany({
      where: { 
        tenantId,
        status: { not: "TERMINATED" } // Only update non-terminated leases
      },
      data: { 
        status: "TERMINATED",
        endDate: today // Update the actual end date to today
      },
    });

    // CRITICAL: Update unit status to VACANT
    if (tenant.unitId) {
      await prisma.units.update({
        where: { id: tenant.unitId },
        data: { status: "VACANT" },
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Tenant vacated successfully",
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
