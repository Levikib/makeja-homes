import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { createSubaccount, resolveAccountNumber, listBanks } from "@/lib/paystack";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    // Only ADMIN can create subaccounts
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { propertyId, businessName, bankCode, accountNumber, email } = body;

    console.log("🏦 Creating/Updating Paystack subaccount:", {
      propertyId,
      businessName,
      bankCode,
      userId,
      role,
    });

    // Get users company
    const user = await prisma.users.findUnique({
	where: { id: userId },
	select: {companyId: true },
    });

    // Verify property belongs to user
    const property = await prisma.properties.findFirst({
      where: {
	 id: propertyId,
	OR: [
 	  { createdById: userId }, //Property created by this user
	  { companyId: user?.companyId || undefined }, 
	]
	},
    });

    if (!property) {
	console.error("Property not found or access denied:", {
	propertyId,
	userId,
	userCompanyId: user?.companyId,
	});
      return NextResponse.json(
        { error: "Property not found or you don't have permission to configure payment for this property" },
        { status: 404 }
      );
    }

    console.log("Property found:", property.id);

    // Step 1: Verify bank account with Paystack
    console.log("🔍 Verifying bank account...");
    let accountName;
    try {
      const accountVerification = await resolveAccountNumber(
        accountNumber,
        bankCode
      );
      accountName = accountVerification.accountName;
      console.log("✅ Account verified:", accountName);
    } catch (error: any) {
      console.error("❌ Account verification failed:", error);
      return NextResponse.json(
        { error: "Invalid bank account details. Please verify and try again." },
        { status: 400 }
      );
    }

    // Step 2: Create Paystack subaccount (NO COMMISSION - 100% to landlord)
    console.log("🏦 Creating subaccount...");
    let subaccountResult;
    try {
      subaccountResult = await createSubaccount(
        businessName,
        bankCode,
        accountNumber,
        email
      );
      console.log("✅ Subaccount created:", subaccountResult.subaccountCode);
    } catch (error: any) {
      console.error("❌ Subaccount creation failed:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create Paystack subaccount" },
        { status: 500 }
      );
    }

    // Step 3: Update property with subaccount details
    await prisma.properties.update({
      where: { id: propertyId },
      data: {
        paystackSubaccountCode: subaccountResult.subaccountCode,
        paystackAccountEmail: email,
        paystackBankCode: bankCode,
        paystackAccountNumber: accountNumber,
        paystackAccountName: accountName,
        paystackActive: true,
        updatedAt: new Date(),
      },
    });

    console.log("✅ Property updated with Paystack details");

    return NextResponse.json({
      success: true,
      message: property.paystackSubaccountCode 
        ? "Paystack configuration updated successfully" 
        : "Paystack subaccount created successfully",
      subaccountCode: subaccountResult.subaccountCode,
      accountName: accountName,
      accountNumber: accountNumber,
    });
  } catch (error: any) {
    console.error("❌ Paystack subaccount error:", error);
    return NextResponse.json(
      { error: "Failed to setup Paystack" },
      { status: 500 }
    );
  }
}
