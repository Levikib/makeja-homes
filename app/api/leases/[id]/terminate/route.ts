import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const today = new Date();

    await prisma.lease_agreements.update({
      where: { id: params.id },
      data: {
        status: "TERMINATED",
        endDate: today, // Actual termination date
        updatedAt: today,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Lease terminated successfully with actual end date recorded." 
    });
  } catch (error) {
    console.error("Error terminating lease:", error);
    return NextResponse.json({ error: "Failed to terminate lease" }, { status: 500 });
  }
}
