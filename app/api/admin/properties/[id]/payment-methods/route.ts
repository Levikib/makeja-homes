import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (!["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const propertyId = params.id;
    const body = await request.json();

    const db = getPrismaForRequest(request);

    // Verify property exists
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT id FROM properties WHERE id = $1 LIMIT 1`,
      propertyId
    );

    if (!rows.length) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    await db.$executeRawUnsafe(
      `UPDATE properties SET
        "mpesaPhoneNumber" = $2, "mpesaTillNumber" = $3, "mpesaTillName" = $4,
        "mpesaPaybillNumber" = $5, "mpesaPaybillName" = $6,
        "bankAccounts" = $7::jsonb, "paymentInstructions" = $8, "updatedAt" = NOW()
       WHERE id = $1`,
      propertyId,
      body.mpesaPhoneNumber || null,
      body.mpesaTillNumber || null,
      body.mpesaTillName || null,
      body.mpesaPaybillNumber || null,
      body.mpesaPaybillName || null,
      body.bankAccounts ? (typeof body.bankAccounts === 'string' ? body.bankAccounts : JSON.stringify(body.bankAccounts)) : null,
      body.paymentInstructions || null,
    );

    return NextResponse.json({ success: true, message: "Payment methods updated successfully" });
  } catch (error: any) {
    console.error("Error updating payment methods:", error);
    return NextResponse.json({ error: "Failed to update payment methods" }, { status: 500 });
  }
}
