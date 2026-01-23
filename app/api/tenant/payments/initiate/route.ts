import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "TENANT") {
      return NextResponse.json({ error: "Only tenants can initiate payments" }, { status: 403 });
    }

    const body = await request.json();
    const { billId } = body;

    if (!billId) {
      return NextResponse.json({ error: "Bill ID required" }, { status: 400 });
    }

    // Get bill details
    const bill = await prisma.monthly_bills.findUnique({
      where: { id: billId },
      include: {
        tenants: {
          include: {
            users: true,
            units: {
              include: {
                properties: true,
              },
            },
          },
        },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Verify tenant owns this bill
    if (bill.tenants.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if bill is already paid
    if (bill.status === "PAID") {
      return NextResponse.json({ error: "Bill already paid" }, { status: 400 });
    }

    // Get property Paystack details
    const property = bill.tenants.units.properties;
    
    if (!property.paystackActive || !property.paystackSubaccountCode) {
      return NextResponse.json(
        { error: "Paystack not configured for this property" },
        { status: 400 }
      );
    }

    // Initialize Paystack payment
    const paystackUrl = "https://api.paystack.co/transaction/initialize";
    const reference = `bill_${billId}_${Date.now()}`;

    const paystackResponse = await fetch(paystackUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: bill.tenants.users.email,
        amount: Math.round(bill.totalAmount * 100), // Convert to kobo
        reference: reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tenant/payments?payment=success`,
        metadata: {
          billId: bill.id,
          tenantId: bill.tenantId,
          unitId: bill.unitId,
          propertyId: property.id,
          month: bill.month,
          custom_fields: [
            {
              display_name: "Unit Number",
              variable_name: "unit_number",
              value: bill.tenants.units.unitNumber,
            },
            {
              display_name: "Property",
              variable_name: "property",
              value: property.name,
            },
          ],
        },
        subaccount: property.paystackSubaccountCode,
      }),
    });

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json();
      console.error("❌ Paystack error:", errorData);
      throw new Error("Failed to initialize payment");
    }

    const paystackData = await paystackResponse.json();

    return NextResponse.json({
      success: true,
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      accessCode: paystackData.data.access_code,
    });
  } catch (error: any) {
    console.error("❌ Error initiating payment:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
