import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncUnitStatus } from "@/lib/utils/sync-unit-status";

export async function POST(request: NextRequest) {
  try {
    const { leaseId, agreed } = await request.json();

    if (!agreed) {
      return NextResponse.json(
        { error: "You must agree to the terms to sign the lease" },
        { status: 400 }
      );
    }

    // Get client information for audit trail
    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    
    // Create comprehensive signature data
    const now = new Date();
    const signatureData = {
      signedAt: now.toISOString(),
      ip,
      userAgent,
      agreed: true,
      method: "DIGITAL_CONSENT",
      timestamp: now.getTime(),
    };

    // Update lease with signature information
    const updatedLease = await prisma.lease_agreements.update({
      where: { id: leaseId },
      data: {
        status: "ACTIVE", // Change from PENDING to ACTIVE
        contractSignedAt: now,
        signerIp: ip,
        signerUserAgent: userAgent,
        signatureType: "DIGITAL_CONSENT",
        signatureData: JSON.stringify(signatureData),
        agreementCheckboxes: JSON.stringify({
          termsAgreed: true,
          agreedAt: now.toISOString(),
        }),
        updatedAt: now,
      },
      include: {
        units: true,
      },
    });

    // Sync unit status (RESERVED → OCCUPIED)
    await syncUnitStatus(updatedLease.unitId);

    return NextResponse.json({
      success: true,
      message: "Lease signed successfully!",
      lease: {
        id: updatedLease.id,
        status: updatedLease.status,
        signedAt: updatedLease.contractSignedAt,
      },
    });
  } catch (error: any) {
    console.error("Error signing lease:", error);
    return NextResponse.json(
      { error: "Failed to sign lease", details: error.message },
      { status: 500 }
    );
  }
}
