import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "TENANT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const db = getPrismaForRequest(request);

    // Get tenant + property details
    const rows = await db.$queryRawUnsafe(`
      SELECT
        t.id as "tenantId", t."unitId", t."depositAmount",
        u.email,
        un."unitNumber",
        p.id as "propertyId", p.name as "propertyName",
        p."paystackActive", p."paystackSubaccountCode"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t."userId" = $1
      LIMIT 1
    `, userId) as any[];

    if (!rows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenant = rows[0];

    // subaccount is optional — if not configured, payment goes to main Paystack account

    // Check if deposit already paid
    // Check if deposit already collected — paidDate set means it's been paid
    const depositRows = await db.$queryRawUnsafe(`
      SELECT id, "paidDate" FROM security_deposits
      WHERE "tenantId" = $1
      ORDER BY "createdAt" DESC LIMIT 1
    `, tenant.tenantId) as any[];

    if (depositRows.length && depositRows[0].paidDate) {
      return NextResponse.json({ error: "Security deposit already paid" }, { status: 400 });
    }

    // Also check payments table for a completed DEPOSIT payment
    const existingDepositPayment = await db.$queryRawUnsafe(`
      SELECT id FROM payments
      WHERE "tenantId" = $1 AND "paymentType"::text = 'DEPOSIT'
        AND status::text IN ('COMPLETED', 'VERIFIED')
      LIMIT 1
    `, tenant.tenantId) as any[];

    if (existingDepositPayment.length) {
      return NextResponse.json({ error: "Security deposit already paid" }, { status: 400 });
    }

    const depositAmount = Number(tenant.depositAmount);
    if (!depositAmount || depositAmount <= 0) {
      return NextResponse.json({ error: "No deposit amount configured" }, { status: 400 });
    }

    const reference = `deposit_${tenant.tenantId}_${Date.now()}`;
    const now = new Date();
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await db.$executeRawUnsafe(`
      INSERT INTO payments (id, "referenceNumber", "tenantId", "unitId", amount, "paymentType",
        "paymentMethod", status, "paystackStatus", "paystackReference", "createdById",
        notes, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, 'DEPOSIT'::text::"PaymentType", 'PAYSTACK'::text::"PaymentMethod",
        'PENDING'::text::"PaymentStatus", 'pending', $2, $6, $7, $8, $8)
    `, paymentId, reference, tenant.tenantId, tenant.unitId, depositAmount, userId,
      "Security deposit payment", now);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://makejahomes.co.ke";
    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: tenant.email,
        amount: Math.round(depositAmount * 100),
        reference,
        callback_url: `${appUrl}/dashboard/tenant/payments?payment=success&reference=${reference}`,
        metadata: {
          type: "DEPOSIT",
          tenantId: tenant.tenantId,
          unitId: tenant.unitId,
          propertyId: tenant.propertyId,
          paymentId,
          custom_fields: [
            { display_name: "Unit", variable_name: "unit", value: tenant.unitNumber },
            { display_name: "Property", variable_name: "property", value: tenant.propertyName },
            { display_name: "Type", variable_name: "type", value: "Security Deposit" },
          ],
        },
        ...(tenant.paystackSubaccountCode ? { subaccount: tenant.paystackSubaccountCode } : {}),
      }),
    });

    if (!psRes.ok) {
      const err = await psRes.json();
      console.error("Paystack error:", err);
      throw new Error("Failed to initialize deposit payment");
    }

    const psData = await psRes.json();
    return NextResponse.json({
      success: true,
      authorizationUrl: psData.data.authorization_url,
      reference: psData.data.reference,
      amount: depositAmount,
    });
  } catch (error: any) {
    console.error("Deposit payment error:", error?.message);
    return NextResponse.json({ error: "Failed to initiate deposit payment" }, { status: 500 });
  }
}
