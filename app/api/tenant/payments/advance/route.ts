import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { patchPaymentsSchema } from "@/lib/patch-payments-schema";

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

    const { months } = await request.json();
    if (!months || months < 1 || months > 12) {
      return NextResponse.json({ error: "Months must be between 1 and 12" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    // Get tenant + property details
    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT
        t.id as "tenantId", t."unitId", t."rentAmount",
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
    `, userId);

    if (!rows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenant = rows[0];

    // subaccount is optional — if not configured, payment goes to main Paystack account
    await patchPaymentsSchema(db);

    const rentAmount = Number(tenant.rentAmount);
    const totalAmount = rentAmount * months;
    const reference = `advance_${tenant.tenantId}_${months}mo_${Date.now()}`;
    const now = new Date();

    // Create payment record
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await db.$executeRawUnsafe([
      `INSERT INTO payments (id, "referenceNumber", reference, "tenantId", "unitId", amount,`,
      `  "paymentType", type, "paymentMethod", method,`,
      `  status, "paystackStatus", "paystackReference", "createdById", notes, "createdAt", "updatedAt")`,
      `VALUES ($1, $2, $2, $3, $4, $5,`,
      `  'RENT', 'RENT'::text::"PaymentType",`,
      `  'PAYSTACK', 'PAYSTACK'::text::"PaymentMethod",`,
      `  'PENDING'::text::"PaymentStatus", 'pending', $2, $6, $7, $8, $8)`,
    ].join(' '),
      paymentId, reference, tenant.tenantId, tenant.unitId,
      totalAmount, userId,
      `Advance rent payment — ${months} month${months > 1 ? "s" : ""}`,
      now
    );

    // Initialize Paystack
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://makejahomes.co.ke";
    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: tenant.email,
        amount: Math.round(totalAmount * 100),
        reference,
        callback_url: `${appUrl}/dashboard/tenant/payments?payment=success`,
        metadata: {
          type: "ADVANCE_RENT",
          months,
          tenantId: tenant.tenantId,
          unitId: tenant.unitId,
          propertyId: tenant.propertyId,
          paymentId,
          custom_fields: [
            { display_name: "Unit", variable_name: "unit", value: tenant.unitNumber },
            { display_name: "Property", variable_name: "property", value: tenant.propertyName },
            { display_name: "Months", variable_name: "months", value: `${months} months advance` },
          ],
        },
        ...(tenant.paystackSubaccountCode ? { subaccount: tenant.paystackSubaccountCode } : {}),
      }),
    });

    if (!psRes.ok) {
      const err = await psRes.json();
      console.error("Paystack error:", err);
      throw new Error("Failed to initialize Paystack payment");
    }

    const psData = await psRes.json();

    return NextResponse.json({
      success: true,
      authorizationUrl: psData.data.authorization_url,
      reference: psData.data.reference,
      months,
      totalAmount,
    });

  } catch (error: any) {
    console.error("Advance payment error:", error?.message);
    return NextResponse.json({ error: "Failed to initiate advance payment" }, { status: 500 });
  }
}
