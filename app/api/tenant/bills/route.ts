import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    const role = payload.role as string;

    if (role !== "TENANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = getPrismaForRequest(request);

    // Get tenant + unit + property
    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT
        t.id as "tenantId",
        t."unitId",
        un."unitNumber",
        p.id as "propertyId",
        p.name as "propertyName",
        p."paystackActive",
        p."paystackSubaccountCode"
      FROM tenants t
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t."userId" = $1
      LIMIT 1
    `, userId);

    if (!tenantRows.length) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenant = tenantRows[0];

    // Get all monthly bills
    let allBills: any[] = [];
    try {
      allBills = await db.$queryRawUnsafe<any[]>(`
        SELECT id, month, "rentAmount", "waterAmount", "garbageAmount", "totalAmount",
               status::text as status, "dueDate", "paidDate"
        FROM monthly_bills
        WHERE "tenantId" = $1
        ORDER BY month DESC
      `, tenant.tenantId);
    } catch {
      // monthly_bills table may not exist yet or be empty — that's fine
    }

    const currentBill = allBills[0] || null;
    const billHistory = allBills.slice(1);

    // Water reading for current bill
    let waterDetails = null;
    if (currentBill) {
      try {
        const wr = await db.$queryRawUnsafe<any[]>(`
          SELECT "previousReading", "currentReading", "unitsConsumed", "ratePerUnit", "amountDue", "readingDate"
          FROM water_readings
          WHERE "tenantId" = $1
            AND EXTRACT(MONTH FROM "readingDate") = $2
            AND EXTRACT(YEAR FROM "readingDate") = $3
          LIMIT 1
        `, tenant.tenantId,
          new Date(currentBill.month).getMonth() + 1,
          new Date(currentBill.month).getFullYear()
        );
        if (wr.length) {
          waterDetails = {
            previousReading: wr[0].previousReading || 0,
            currentReading: wr[0].currentReading,
            unitsConsumed: wr[0].unitsConsumed,
            ratePerUnit: wr[0].ratePerUnit,
            amount: wr[0].amountDue,
            readingDate: wr[0].readingDate,
          };
        }
      } catch {}
    }

    const garbageDetails = currentBill ? {
      amount: currentBill.garbageAmount || 0,
      isApplicable: (currentBill.garbageAmount || 0) > 0,
    } : null;

    const propertyMeta = {
      id: tenant.propertyId,
      name: tenant.propertyName,
      paystackActive: tenant.paystackActive,
      paystackSubaccountCode: tenant.paystackSubaccountCode,
    };
    const unitMeta = { id: tenant.unitId, unitNumber: tenant.unitNumber };
    const tenantMeta = { id: tenant.tenantId, userId };

    const formatBill = (b: any) => ({
      id: b.id,
      month: b.month,
      rent: b.rentAmount || 0,
      water: b.waterAmount || 0,
      garbage: b.garbageAmount || 0,
      total: b.totalAmount || 0,
      status: b.status,
      dueDate: b.dueDate,
      paidDate: b.paidDate,
      property: propertyMeta,
      unit: unitMeta,
      tenant: tenantMeta,
    });

    const bills = allBills.map(formatBill);

    return NextResponse.json({
      tenant: {
        unitNumber: tenant.unitNumber,
        propertyName: tenant.propertyName,
      },
      currentBill: currentBill ? {
        month: currentBill.month,
        rent: currentBill.rentAmount || 0,
        water: currentBill.waterAmount || 0,
        garbage: currentBill.garbageAmount || 0,
        total: currentBill.totalAmount || 0,
        status: currentBill.status,
        dueDate: currentBill.dueDate,
        paidDate: currentBill.paidDate,
      } : null,
      waterDetails,
      garbageDetails,
      billHistory: billHistory.map((b: any) => ({
        id: b.id,
        month: b.month,
        rent: b.rentAmount || 0,
        water: b.waterAmount || 0,
        garbage: b.garbageAmount || 0,
        total: b.totalAmount || 0,
        status: b.status,
        dueDate: b.dueDate,
        paidDate: b.paidDate,
      })),
      bills,
    });

  } catch (error: any) {
    console.error("Error fetching tenant bills:", error?.message);
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 });
  }
}
