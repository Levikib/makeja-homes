import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const today = new Date();

    // Get lease details first
    const lease = await prisma.lease_agreements.findUnique({
      where: { id: params.id },
      select: {
        tenantId: true,
        unitId: true,
        status: true,
      },
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    // Use transaction to update everything atomically
    await prisma.$transaction(async (tx) => {
      // 1. Mark lease as TERMINATED
      await tx.lease_agreements.update({
        where: { id: params.id },
        data: {
          status: "TERMINATED",
          endDate: today, // Actual termination date
          updatedAt: today,
        },
      });

      // 2. Mark unit as VACANT
      await tx.units.update({
        where: { id: lease.unitId },
        data: {
          status: "VACANT",
          updatedAt: today,
        },
      });

      // 3. Update tenant lease end date (no actualVacateDate field)
      await tx.tenants.update({
        where: { id: lease.tenantId },
        data: {
          leaseEndDate: today,
          updatedAt: today,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Lease terminated successfully. Unit marked as vacant."
    });
  } catch (error) {
    console.error("Error terminating lease:", error);
    return NextResponse.json({ error: "Failed to terminate lease" }, { status: 500 });
  }
}
