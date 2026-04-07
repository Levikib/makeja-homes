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
    const role = payload.role as string;

    if (role !== "TENANT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const db = getPrismaForRequest(request);

    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT
        t.id as "tenantId", t."unitId", t."rentAmount" as "baseRent",
        t."depositAmount",
        un."unitNumber",
        p.id as "propertyId", p.name as "propertyName",
        p."paystackActive", p."paystackSubaccountCode"
      FROM tenants t
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t."userId" = $1
      LIMIT 1
    `, userId);

    if (!tenantRows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenant = tenantRows[0];

    // Get all monthly bills
    let allBills: any[] = [];
    try {
      allBills = await db.$queryRawUnsafe<any[]>(`
        SELECT id, month, "rentAmount", "waterAmount", "garbageAmount", "totalAmount",
               status::text as status, "dueDate", "paidDate"
        FROM monthly_bills WHERE "tenantId" = $1
        ORDER BY month DESC
      `, tenant.tenantId);
    } catch {}

    // For each bill, sum approved payments to get amountPaid and balance
    const billIds = allBills.map(b => b.id);
    let paymentSums: Record<string, number> = {};
    if (billIds.length > 0) {
      try {
        // Sum all COMPLETED+APPROVED or VERIFIED payments per bill
        const sums = await db.$queryRawUnsafe<any[]>(`
          SELECT "leaseId" as "billId", SUM(amount) as "amountPaid"
          FROM payments
          WHERE "tenantId" = $1
            AND status::text IN ('COMPLETED','VERIFIED')
            AND "verificationStatus"::text IN ('APPROVED','PENDING')
          GROUP BY "leaseId"
        `, tenant.tenantId);
        // Note: payments link to bills via leaseId field in some setups — try direct billId match too
        for (const s of sums) {
          if (s.billId) paymentSums[s.billId] = Number(s.amountPaid);
        }
      } catch {}
    }

    // Deposit info
    let depositRecord: any = null;
    try {
      const dep = await db.$queryRawUnsafe<any[]>(`
        SELECT id, amount, status::text as status, "paidDate"
        FROM security_deposits WHERE "tenantId" = $1 LIMIT 1
      `, tenant.tenantId);
      depositRecord = dep[0] || null;
    } catch {}

    // Water reading for current bill
    const currentBill = allBills[0] || null;
    let waterDetails = null;
    if (currentBill) {
      try {
        const wr = await db.$queryRawUnsafe<any[]>(`
          SELECT "previousReading", "currentReading", "unitsConsumed", "ratePerUnit", "amountDue", "readingDate"
          FROM water_readings WHERE "tenantId" = $1
            AND EXTRACT(MONTH FROM "readingDate") = $2
            AND EXTRACT(YEAR FROM "readingDate") = $3
          LIMIT 1
        `, tenant.tenantId,
          new Date(currentBill.month).getMonth() + 1,
          new Date(currentBill.month).getFullYear()
        );
        if (wr.length) waterDetails = {
          previousReading: wr[0].previousReading || 0,
          currentReading: wr[0].currentReading,
          unitsConsumed: wr[0].unitsConsumed,
          ratePerUnit: wr[0].ratePerUnit,
          amount: wr[0].amountDue,
          readingDate: wr[0].readingDate,
        };
      } catch {}
    }

    const propertyMeta = {
      id: tenant.propertyId,
      name: tenant.propertyName,
      paystackActive: tenant.paystackActive,
      paystackSubaccountCode: tenant.paystackSubaccountCode,
    };
    const unitMeta = { id: tenant.unitId, unitNumber: tenant.unitNumber };
    const tenantMeta = { id: tenant.tenantId, userId };

    const enrichBill = (b: any) => {
      const amountPaid = paymentSums[b.id] || 0;
      const balance = Math.max(0, Number(b.totalAmount) - amountPaid);
      const isPartial = amountPaid > 0 && balance > 0;
      return {
        id: b.id,
        month: b.month,
        rent: Number(b.rentAmount) || 0,
        water: Number(b.waterAmount) || 0,
        garbage: Number(b.garbageAmount) || 0,
        total: Number(b.totalAmount) || 0,
        amountPaid,
        balance,
        isPartial,
        status: b.status,
        dueDate: b.dueDate,
        paidDate: b.paidDate,
        // Also include raw field names for payments page compatibility
        rentAmount: Number(b.rentAmount) || 0,
        waterAmount: Number(b.waterAmount) || 0,
        garbageAmount: Number(b.garbageAmount) || 0,
        totalAmount: Number(b.totalAmount) || 0,
        property: propertyMeta,
        unit: unitMeta,
        tenant: tenantMeta,
      };
    };

    const bills = allBills.map(enrichBill);

    return NextResponse.json({
      tenant: { unitNumber: tenant.unitNumber, propertyName: tenant.propertyName },
      currentBill: currentBill ? {
        month: currentBill.month,
        rent: Number(currentBill.rentAmount) || 0,
        water: Number(currentBill.waterAmount) || 0,
        garbage: Number(currentBill.garbageAmount) || 0,
        total: Number(currentBill.totalAmount) || 0,
        amountPaid: paymentSums[currentBill.id] || 0,
        balance: Math.max(0, Number(currentBill.totalAmount) - (paymentSums[currentBill.id] || 0)),
        isPartial: (paymentSums[currentBill.id] || 0) > 0 && Math.max(0, Number(currentBill.totalAmount) - (paymentSums[currentBill.id] || 0)) > 0,
        status: currentBill.status,
        dueDate: currentBill.dueDate,
        paidDate: currentBill.paidDate,
      } : null,
      waterDetails,
      garbageDetails: currentBill ? {
        amount: Number(currentBill.garbageAmount) || 0,
        isApplicable: (Number(currentBill.garbageAmount) || 0) > 0,
      } : null,
      billHistory: allBills.slice(1).map(b => enrichBill(b)),
      bills,
      deposit: depositRecord ? {
        amount: Number(depositRecord.amount),
        status: depositRecord.status,
        paidDate: depositRecord.paidDate,
        outstanding: depositRecord.status !== 'REFUNDED' && !depositRecord.paidDate,
      } : {
        amount: Number(tenant.depositAmount),
        status: 'HELD',
        paidDate: null,
        outstanding: Number(tenant.depositAmount) > 0,
      },
      baseRent: Number(tenant.baseRent) || 0,
    });

  } catch (error: any) {
    console.error("Tenant bills error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 });
  }
}
