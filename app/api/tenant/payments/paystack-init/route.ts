import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { initializePayment } from "@/lib/paystack";

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
    const { billId, amount } = body;

    console.log("💳 Processing Paystack payment:", { userId, billId, amount });

    // Get tenant details
    const tenant = await prisma.tenants.findFirst({
      where: { userId },
      include: {
        users: true,
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
    const tenantEmail = tenant.users.email;

    // Check if property has Paystack configured
    if (!property.paystackActive || !property.paystackSubaccountCode) {
      return NextResponse.json(
        { error: "Paystack not configured for this property. Please contact your landlord." },
        { status: 400 }
      );
    }

    // Generate reference
    const reference = `RENT-${unitNumber}-${Date.now()}`;

    // Create payment record
    const payment = await prisma.payments.create({
      data: {
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        tenantId: tenant.id,
        unitId: tenant.unitId,
        amount: amount,
        paymentType: "RENT",
        paymentMethod: "PAYSTACK",
        status: "PENDING",
        paymentDate: new Date(),
        referenceNumber: reference,
        paystackReference: reference,
        notes: `Paystack payment for ${property.name}, Unit ${unitNumber}`,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ Payment record created:", payment.id);

    // Initialize Paystack payment (routes to landlord's subaccount - NO COMMISSION)
    const paystackResponse = await initializePayment(
      tenantEmail,
      amount,
      reference,
      property.paystackSubaccountCode, // Landlord's subaccount
      {
        propertyId: property.id,
        propertyName: property.name,
        unitNumber: unitNumber,
        tenantId: tenant.id,
        tenantName: `${tenant.users.firstName} ${tenant.users.lastName}`,
        paymentId: payment.id,
        billId: billId,
      }
    );

    console.log("✅ Paystack payment initialized:", paystackResponse.reference);

    return NextResponse.json({
      success: true,
      paymentUrl: paystackResponse.authorizationUrl,
      reference: reference,
      paymentId: payment.id,
    });
  } catch (error: any) {
    console.error("❌ Paystack payment error:", error);
    return NextResponse.json(
      { error: error.message || "Payment initialization failed" },
      { status: 500 }
    );
  }
}