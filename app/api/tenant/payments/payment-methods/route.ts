import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const db = getPrismaForRequest(request);

    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT
        p.id as "propertyId", p.name as "propertyName",
        p."paystackActive", p."paystackSubaccountCode", p."paystackAccountEmail",
        p."mpesaPhoneNumber", p."mpesaTillNumber", p."mpesaTillName",
        p."mpesaPaybillNumber", p."mpesaPaybillName",
        p."bankAccounts", p."paymentInstructions",
        un."unitNumber"
      FROM tenants t
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t."userId" = $1
      LIMIT 1
    `, userId);

    if (!rows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const p = rows[0];

    let bankAccounts: any[] = [];
    try {
      if (p.bankAccounts) {
        const parsed = typeof p.bankAccounts === 'string' ? JSON.parse(p.bankAccounts) : p.bankAccounts;
        bankAccounts = Array.isArray(parsed) ? parsed : [];
      }
    } catch {}

    return NextResponse.json({
      property: { id: p.propertyId, name: p.propertyName },
      paystack: {
        available: !!(p.paystackActive && p.paystackSubaccountCode),
        subaccountCode: p.paystackSubaccountCode || null,
        email: p.paystackAccountEmail || null,
      },
      mpesa: {
        phone: { available: !!p.mpesaPhoneNumber, number: p.mpesaPhoneNumber || null },
        till: { available: !!p.mpesaTillNumber, number: p.mpesaTillNumber || null, name: p.mpesaTillName || null },
        paybill: { available: !!p.mpesaPaybillNumber, number: p.mpesaPaybillNumber || null, name: p.mpesaPaybillName || null },
      },
      bank: { available: bankAccounts.length > 0, accounts: bankAccounts },
      instructions: p.paymentInstructions || null,
      unitNumber: p.unitNumber,
    });
  } catch (error: any) {
    console.error("Payment methods error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch payment methods" }, { status: 500 });
  }
}
