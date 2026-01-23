import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ FIXED: Use JWT_SECRET (same as middleware and other APIs)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;
    const companyId = payload.companyId as string | null;

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const propertyId = params.id;
    const body = await request.json();

    console.log("📝 Updating manual payment methods for property:", propertyId);

    // Verify property belongs to user or their company
    const property = await prisma.properties.findFirst({
      where: {
        id: propertyId,
        OR: [
          { createdById: userId },
          { companyId: companyId || undefined },
        ],
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found or you don't have permission" },
        { status: 404 }
      );
    }

    // Update manual payment methods
    await prisma.properties.update({
      where: { id: propertyId },
      data: {
        mpesaPhoneNumber: body.mpesaPhoneNumber || null,
        mpesaTillNumber: body.mpesaTillNumber || null,
        mpesaTillName: body.mpesaTillName || null,
        mpesaPaybillNumber: body.mpesaPaybillNumber || null,
        mpesaPaybillName: body.mpesaPaybillName || null,
        bankAccounts: body.bankAccounts || null,
        paymentInstructions: body.paymentInstructions || null,
        updatedAt: new Date(),
      },
    });

    console.log("✅ Manual payment methods updated successfully");

    return NextResponse.json({
      success: true,
      message: "Payment methods updated successfully",
    });
  } catch (error: any) {
    console.error("❌ Error updating payment methods:", error);
    return NextResponse.json(
      { error: "Failed to update payment methods" },
      { status: 500 }
    );
  }
}
