import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { initializeTransaction } from "@/lib/paystack";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const body = await request.json();
    const { billId, amount, paymentType } = body;

    const db = getPrismaForRequest(request);

    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT t.id, t."unitId",
        u.email, u."firstName", u."lastName",
        un."unitNumber",
        p.id AS "propertyId", p.name AS "propertyName",
        p."paystackSubaccountCode"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t."userId" = $1 LIMIT 1
    `, userId);

    if (!tenantRows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenant = tenantRows[0];

    const pType = paymentType ?? "RENT";
    const reference = `${pType}-${tenant.unitNumber}-${Date.now()}`;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();

    await db.$executeRawUnsafe(`
      INSERT INTO payments (
        id, "referenceNumber", "tenantId", "unitId", amount,
        "paymentType", "paymentMethod", status, "paystackReference",
        "paymentDate", "createdById", notes, "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6::text::"PaymentType", 'PAYSTACK'::"PaymentMethod", 'PENDING'::"PaymentStatus", $2,
        $7, $8, $9, $7, $7
      )
    `,
      paymentId, reference, tenant.id, tenant.unitId, amount,
      pType, now, userId,
      `Paystack payment for ${tenant.propertyName}, Unit ${tenant.unitNumber}`
    );

    const paystackResponse = await initializeTransaction(
      tenant.email,
      amount,
      reference,
      tenant.paystackSubaccountCode || undefined,
      {
        propertyId: tenant.propertyId,
        propertyName: tenant.propertyName,
        unitNumber: tenant.unitNumber,
        tenantId: tenant.id,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        paymentId,
        billId: billId ?? null,
      }
    );

    return NextResponse.json({
      success: true,
      paymentUrl: paystackResponse.authorizationUrl,
      reference,
      paymentId,
    });
  } catch (error: any) {
    console.error("❌ Paystack payment error:", error?.message);
    return NextResponse.json({ error: error.message || "Payment initialization failed" }, { status: 500 });
  }
}
