import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { createSubaccount, resolveAccountNumber } from "@/lib/paystack";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await request.json();
    const { propertyId, businessName, bankCode, accountNumber, email } = body;

    if (!propertyId || !businessName || !bankCode || !accountNumber || !email) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    // Verify property belongs to this user's company
    const userRows = await db.$queryRawUnsafe(`SELECT "companyId" FROM users WHERE id = $1 LIMIT 1`, userId) as any[];
    const companyId = userRows[0]?.companyId;

    const propRows = await db.$queryRawUnsafe(`
      SELECT id, "paystackSubaccountCode" FROM properties
      WHERE id = $1 AND ("createdById" = $2 OR "companyId" = $3)
      LIMIT 1
    `, propertyId, userId, companyId) as any[];

    if (!propRows.length) {
      return NextResponse.json({ error: "Property not found or access denied" }, { status: 404 });
    }

    // Step 1: Verify bank account
    let accountName: string;
    try {
      const result = await resolveAccountNumber(accountNumber, bankCode);
      accountName = result.accountName;
    } catch {
      return NextResponse.json({ error: "Invalid bank account details. Please verify and try again." }, { status: 400 });
    }

    // Step 2: Create Paystack subaccount
    let subaccountResult: { subaccountCode: string };
    try {
      subaccountResult = await createSubaccount(businessName, bankCode, accountNumber, email);
    } catch (error: any) {
      return NextResponse.json({ error: error.message || "Failed to create Paystack subaccount" }, { status: 500 });
    }

    // Step 3: Save to property
    await db.$executeRawUnsafe(`
      UPDATE properties SET
        "paystackSubaccountCode" = $2, "paystackAccountEmail" = $3,
        "paystackBankCode" = $4, "paystackAccountNumber" = $5,
        "paystackAccountName" = $6, "paystackActive" = true, "updatedAt" = NOW()
      WHERE id = $1
    `, propertyId, subaccountResult.subaccountCode, email, bankCode, accountNumber, accountName);

    return NextResponse.json({
      success: true,
      message: propRows[0].paystackSubaccountCode
        ? "Paystack configuration updated successfully"
        : "Paystack subaccount created successfully",
      subaccountCode: subaccountResult.subaccountCode,
      accountName,
      accountNumber,
    });
  } catch (error: any) {
    console.error("Paystack subaccount error:", error?.message);
    return NextResponse.json({ error: "Failed to setup Paystack" }, { status: 500 });
  }
}
