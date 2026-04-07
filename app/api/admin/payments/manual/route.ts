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

    if (payload.role !== "ADMIN" && payload.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      tenantId,
      amount: rawAmount,
      paymentMethod,
      paymentDate,
      referenceNumber,
      notes,
      billId,         // single bill to apply against (optional)
      isPartial,      // true = partial, false/absent = full payment
    } = body;

    const amount = parseFloat(rawAmount);
    if (!tenantId || !amount || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    // Fetch tenant + unit
    const tenantRows = await db.$queryRawUnsafe(`
      SELECT t.id, t."unitId" FROM tenants t WHERE t.id = $1 LIMIT 1
    `, tenantId) as any[];
    if (!tenantRows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const { unitId } = tenantRows[0];

    const finalRef = referenceNumber?.trim() ||
      `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const paidAt = paymentDate ? new Date(paymentDate) : now;

    // Determine payment type
    let paymentTypeStr = "RENT";
    if (notes?.toLowerCase().includes("deposit")) paymentTypeStr = "DEPOSIT";
    else if (notes?.toLowerCase().includes("water") || notes?.toLowerCase().includes("utility")) paymentTypeStr = "UTILITY";

    // Create payment record
    await db.$executeRawUnsafe(`
      INSERT INTO payments (
        id, "referenceNumber", "tenantId", "unitId", amount,
        "paymentType", "paymentMethod", status, "paystackStatus",
        "paymentDate", "createdById", notes, "verificationStatus",
        "verifiedById", "verifiedAt", "verificationNotes",
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6::text::"PaymentType", $7::text::"PaymentMethod",
        'COMPLETED'::text::"PaymentStatus", 'manual',
        $8, $9, $10, 'APPROVED',
        $9, $11, 'Manual payment recorded by admin',
        $11, $11
      )
    `,
      paymentId, finalRef, tenantId, unitId, amount,
      paymentTypeStr, paymentMethod,
      paidAt, userId,
      notes || null,
      now
    );

    // Apply to a specific bill if given
    if (billId) {
      const billRows = await db.$queryRawUnsafe(`
        SELECT id, "totalAmount", status FROM monthly_bills
        WHERE id = $1 AND "tenantId" = $2 LIMIT 1
      `, billId, tenantId) as any[];

      if (billRows.length) {
        const bill = billRows[0];
        const billTotal = Number(bill.totalAmount);

        // Sum all approved payments already on this bill
        const priorRows = await db.$queryRawUnsafe(`
          SELECT COALESCE(SUM(p.amount), 0) as paid
          FROM payments p
          WHERE p."tenantId" = $1
            AND p.status IN ('COMPLETED', 'VERIFIED')
            AND p.notes LIKE $2
        `, tenantId, `%bill:${billId}%`) as any[];
        const priorPaid = Number(priorRows[0]?.paid || 0);
        const totalPaidNow = priorPaid + amount;

        // Update notes on this payment to tag it to the bill
        await db.$executeRawUnsafe(`
          UPDATE payments SET notes = COALESCE(notes, '') || ' bill:' || $2 WHERE id = $1
        `, paymentId, billId);

        if (totalPaidNow >= billTotal) {
          // Fully paid
          await db.$executeRawUnsafe(`
            UPDATE monthly_bills SET status = 'PAID'::text::"BillStatus", "paidDate" = $2, "paymentId" = $3, "updatedAt" = $2
            WHERE id = $1
          `, billId, now, paymentId);
        }
        // If partial, leave bill as PENDING — tenant dashboard shows progress bar
      } else if (!billId && !isPartial) {
        // No bill specified: mark oldest pending bill
        const pendingBills = await db.$queryRawUnsafe(`
          SELECT id, "totalAmount" FROM monthly_bills
          WHERE "tenantId" = $1 AND status IN ('PENDING', 'OVERDUE')
          ORDER BY month ASC LIMIT 1
        `, tenantId) as any[];

        if (pendingBills.length && amount >= Number(pendingBills[0].totalAmount)) {
          await db.$executeRawUnsafe(`
            UPDATE monthly_bills SET status = 'PAID'::text::"BillStatus", "paidDate" = $2, "paymentId" = $3, "updatedAt" = $2
            WHERE id = $1
          `, pendingBills[0].id, now, paymentId);
        }
      }
    }

    console.log("Manual payment recorded:", paymentId);
    return NextResponse.json({
      success: true,
      payment: { id: paymentId, referenceNumber: finalRef, amount, status: "COMPLETED" },
    });
  } catch (error: any) {
    console.error("Error recording manual payment:", error?.message);
    return NextResponse.json({ error: "Failed to record payment", detail: error?.message }, { status: 500 });
  }
}
