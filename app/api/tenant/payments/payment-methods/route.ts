import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    console.log("🏦 Fetching payment methods for user:", userId);

    // Get tenant with property details
    const tenant = await prisma.tenants.findFirst({
      where: { userId },
      include: {
        units: {
          include: {
            properties: {
              select: {
                id: true,
                name: true,
                // Paystack configuration
                paystackSubaccountCode: true,
                paystackAccountEmail: true,
                paystackActive: true,
                // Legacy payment methods (for display only)
                mpesaPhoneNumber: true,
                mpesaTillNumber: true,
                mpesaTillName: true,
                mpesaPaybillNumber: true,
                mpesaPaybillName: true,
                bankAccounts: true,
                paymentInstructions: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const property = tenant.units.properties;

    console.log("🏢 Property data:", {
      name: property.name,
      paystackActive: property.paystackActive,
      hasSubaccount: !!property.paystackSubaccountCode,
    });

    const paymentMethods = {
      property: {
        id: property.id,
        name: property.name,
      },
      // Primary payment method: Paystack
      paystack: {
        available: property.paystackActive && !!property.paystackSubaccountCode,
        subaccountCode: property.paystackSubaccountCode,
        email: property.paystackAccountEmail,
      },
      // Legacy methods (for display/manual payments)
      mpesa: {
        phone: {
          available: !!property.mpesaPhoneNumber,
          number: property.mpesaPhoneNumber,
        },
        till: {
          available: !!property.mpesaTillNumber,
          number: property.mpesaTillNumber,
          name: property.mpesaTillName,
        },
        paybill: {
          available: !!property.mpesaPaybillNumber,
          number: property.mpesaPaybillNumber,
          name: property.mpesaPaybillName,
        },
      },
      bank: {
        available: property.bankAccounts ? JSON.parse(property.bankAccounts as string).length > 0 : false,
        accounts: property.bankAccounts ? JSON.parse(property.bankAccounts as string) : [],
      },
      instructions: property.paymentInstructions,
      unitNumber: tenant.units.unitNumber,
    };

    console.log("✅ Payment methods response:", JSON.stringify(paymentMethods, null, 2));

    return NextResponse.json(paymentMethods);
  } catch (error: any) {
    console.error("❌ Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}