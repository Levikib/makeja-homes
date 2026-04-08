import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest, resolveSchema } from "@/lib/get-prisma";
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

    if (role !== "TENANT") return NextResponse.json({ error: "Only tenants can initiate payments" }, { status: 403 });

    const { billId } = await request.json();
    if (!billId) return NextResponse.json({ error: "Bill ID required" }, { status: 400 });

    const db = getPrismaForRequest(request);
    const tenantSlug = resolveSchema(request).replace("tenant_", "");

    // Get tenant
    const tenantRows = await db.$queryRawUnsafe(`
      SELECT t.id as "tenantId", t."unitId", u.email
      FROM tenants t JOIN users u ON u.id = t."userId"
      WHERE t."userId" = $1 LIMIT 1
    `, userId) as any[];
    if (!tenantRows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const { tenantId, unitId, email } = tenantRows[0];

    // Get bill and verify ownership
    const billRows = await db.$queryRawUnsafe(`
      SELECT b.id, b."totalAmount", b.status, b.month, b."tenantId",
        un."unitNumber", p.id as "propertyId", p.name as "propertyName",
        p."paystackActive", p."paystackSubaccountCode"
      FROM monthly_bills b
      JOIN units un ON un.id = b."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE b.id = $1 AND b."tenantId" = $2
      LIMIT 1
    `, billId, tenantId) as any[];

    if (!billRows.length) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    const bill = billRows[0];

    if (bill.status === "PAID") return NextResponse.json({ error: "Bill already paid" }, { status: 400 });
    await patchPaymentsSchema(db);
    // subaccount is optional — if not configured, payment goes to main Paystack account

    // Compute balance (totalAmount minus approved payments)
    const paidRows = await db.$queryRawUnsafe(`
      SELECT COALESCE(SUM(amount), 0) as paid
      FROM payments
      WHERE "tenantId" = $1 AND status IN ('COMPLETED', 'VERIFIED')
        AND notes LIKE '%${billId}%'
    `, tenantId) as any[];
    const alreadyPaid = Number(paidRows[0]?.paid || 0);
    const balanceDue = Math.max(0, Number(bill.totalAmount) - alreadyPaid);

    if (balanceDue <= 0) return NextResponse.json({ error: "Bill already paid" }, { status: 400 });

    const reference = `bill_${billId}_${Date.now()}`;
    const now = new Date();
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await db.$executeRawUnsafe([
      `INSERT INTO payments (id, "referenceNumber", reference, "tenantId", "unitId", amount,`,
      `  "paymentType", type, "paymentMethod", method,`,
      `  status, "paystackStatus", "paystackReference", "createdById", notes, "createdAt", "updatedAt")`,
      `VALUES ($1, $2, $2, $3, $4, $5,`,
      `  'RENT', 'RENT'::text::"PaymentType",`,
      `  'PAYSTACK', 'PAYSTACK'::text::"PaymentMethod",`,
      `  'PENDING'::text::"PaymentStatus", 'pending', $2, $6, $7, $8, $8)`,
    ].join(' '), paymentId, reference, tenantId, unitId, balanceDue, userId,
      `Bill payment for ${new Date(bill.month).toLocaleDateString("en-KE", { month: "long", year: "numeric" })} — bill:${billId}`,
      now);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://makejahomes.co.ke";
    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(balanceDue * 100),
        reference,
        callback_url: `${appUrl}/dashboard/tenant/payments?payment=success&reference=${reference}`,
        metadata: {
          billId,
          tenantId,
          unitId,
          tenantSlug,
          propertyId: bill.propertyId,
          month: bill.month,
          paymentId,
          custom_fields: [
            { display_name: "Unit", variable_name: "unit", value: bill.unitNumber },
            { display_name: "Property", variable_name: "property", value: bill.propertyName },
          ],
        },
        ...(bill.paystackSubaccountCode ? { subaccount: bill.paystackSubaccountCode } : {}),
      }),
    });

    if (!psRes.ok) {
      const err = await psRes.json();
      console.error("Paystack error:", err);
      throw new Error("Failed to initialize payment");
    }

    const psData = await psRes.json();
    return NextResponse.json({
      success: true,
      authorizationUrl: psData.data.authorization_url,
      reference: psData.data.reference,
    });
  } catch (error: any) {
    console.error("Initiate payment error:", error?.message);
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}
