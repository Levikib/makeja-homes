import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { startDate, endDate, rentAmount, depositAmount } = data;
    const today = new Date();

    // Get the current lease
    const currentLease = await prisma.lease_agreements.findUnique({
      where: { id: params.id },
      select: {
        tenantId: true,
        unitId: true,
        terms: true,
      },
    });

    if (!currentLease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Mark current lease as EXPIRED with actual end date (today)
      await tx.lease_agreements.update({
        where: { id: params.id },
        data: {
          status: "EXPIRED",
          endDate: today, // Actual end date, not the original planned date
          updatedAt: today,
        },
      });

      // Create new lease
      await tx.lease_agreements.create({
        data: {
          id: `lease_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId: currentLease.tenantId,
          unitId: currentLease.unitId,
          status: "PENDING", // New lease starts as PENDING
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          rentAmount: parseFloat(rentAmount),
          depositAmount: parseFloat(depositAmount),
          terms: currentLease.terms,
          createdAt: today,
          updatedAt: today,
        },
      });

      // Update unit status to RESERVED (since new lease is PENDING and needs signing)
      await tx.units.update({
        where: { id: currentLease.unitId },
        data: {
          status: "RESERVED",
          updatedAt: today,
        },
      });
    });

    return NextResponse.json({ 
      success: true, 
      message: "Lease renewed successfully. Old lease marked as expired with actual end date. New lease created with PENDING status." 
    });
  } catch (error) {
    console.error("Error renewing lease:", error);
    return NextResponse.json({ error: "Failed to renew lease" }, { status: 500 });
  }
}
