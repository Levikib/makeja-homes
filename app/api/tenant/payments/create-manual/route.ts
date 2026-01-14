import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    const body = await request.json();
    const { amount, paymentMethod, billId } = body;

    console.log("📝 Creating manual payment:", { userId, amount, paymentMethod });

    // Get tenant details
    const tenant = await prisma.tenants.findFirst({
      where: { userId },
      include: {
        units: {
          include: {
            properties: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const property = tenant.units.properties;
    const unitNumber = tenant.units.unitNumber;

    // Generate reference
    const reference = `MANUAL-${unitNumber}-${Date.now()}`;

    // Map frontend payment method to database enum
    let dbPaymentMethod;
    switch (paymentMethod) {
      case "MPESA_TILL":
      case "MPESA_PAYBILL":
        dbPaymentMethod = "M_PESA";
        break;
      case "BANK_TRANSFER":
        dbPaymentMethod = "BANK_TRANSFER";
        break;
      default:
        dbPaymentMethod = "OTHER";
    }

    // Create payment record
    const payment = await prisma.payments.create({
      data: {
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        tenantId: tenant.id,
        unitId: tenant.unitId,
        amount: amount,
        paymentType: "RENT",
        paymentMethod: dbPaymentMethod, // ✅ NOW USES CORRECT ENUM
        status: "PENDING",
        verificationStatus: "PENDING",
        paymentDate: new Date(),
        referenceNumber: reference,
        notes: `Manual payment (${paymentMethod}) for ${property.name}, Unit ${unitNumber}`,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ Manual payment record created:", payment.id);

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        referenceNumber: reference,
        amount: amount,
        status: payment.status,
        verificationStatus: payment.verificationStatus,
      },
      message: "Payment record created. Please upload proof of payment.",
    });
  } catch (error: any) {
    console.error("❌ Manual payment creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment record" },
      { status: 500 }
    );
  }
}