import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { propertyId, month, year } = body;

    if (!propertyId || !month || !year) {
      return NextResponse.json({ error: "Property ID, month, and year required" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    // Get all active tenants for the property
    const tenants = await db.$queryRawUnsafe<any[]>(`
      SELECT t.id, t."unitId", t."rentAmount", t."createdAt",
        u."firstName", u."lastName", u.email,
        un."unitNumber", un.type::text AS "unitType"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      WHERE un."propertyId" = $1 AND un.status::text = 'OCCUPIED'
    `, propertyId);

    if (tenants.length === 0) {
      return NextResponse.json({ error: "No active tenants found for this property" }, { status: 404 });
    }

    // Get property details
    const propRows = await db.$queryRawUnsafe<any[]>(`
      SELECT id, "chargesGarbageFee", "defaultGarbageFee"
      FROM properties WHERE id = $1 LIMIT 1
    `, propertyId);

    if (propRows.length === 0) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    const property = propRows[0];

    // Get recurring charges for this property
    const charges = await db.$queryRawUnsafe<any[]>(`
      SELECT id, name, amount, "appliesTo", "specificUnits", "unitTypes"
      FROM recurring_charges
      WHERE "propertyIds" @> $1::jsonb AND "isActive" = true
    `, JSON.stringify([propertyId]));

    const billMonthStart = new Date(year, month - 1, 1);
    const billMonthEnd = new Date(year, month, 1);

    // Batch: existing bills this month
    const tenantIds = tenants.map((t: any) => t.id);
    const placeholders = tenantIds.map((_: any, i: number) => `$${i + 3}`).join(", ");
    const existingBills = await db.$queryRawUnsafe<any[]>(`
      SELECT "tenantId" FROM monthly_bills
      WHERE month >= $1 AND month < $2 AND "tenantId" IN (${placeholders})
    `, billMonthStart, billMonthEnd, ...tenantIds);
    const existingBillSet = new Set(existingBills.map((b: any) => b.tenantId));

    // Batch: water readings for this month/year
    const waterRows = await db.$queryRawUnsafe<any[]>(`
      SELECT "tenantId", "amountDue" FROM water_readings
      WHERE month = $1 AND year = $2 AND "tenantId" IN (${placeholders})
    `, month, year, ...tenantIds);
    const waterMap: Record<string, number> = {};
    for (const r of waterRows) waterMap[r.tenantId] = Number(r.amountDue);

    // Batch: garbage fees for this month
    const garbageRows = await db.$queryRawUnsafe<any[]>(`
      SELECT "tenantId", amount FROM garbage_fees
      WHERE month >= $1 AND month < $2 AND "tenantId" IN (${placeholders})
    `, billMonthStart, billMonthEnd, ...tenantIds);
    const garbageMap: Record<string, number> = {};
    for (const r of garbageRows) garbageMap[r.tenantId] = Number(r.amount);

    const generatedBills = [];
    const skippedTenants = [];
    const now = new Date();

    for (const tenant of tenants) {
      if (existingBillSet.has(tenant.id)) {
        skippedTenants.push({ tenantName: `${tenant.firstName} ${tenant.lastName}`, reason: "Bill already exists" });
        continue;
      }

      const rentAmount = Number(tenant.rentAmount) || 0;
      const waterAmount = waterMap[tenant.id] ?? 0;
      let garbageAmount = 0;
      if (property.chargesGarbageFee) {
        garbageAmount = garbageMap[tenant.id] ?? (Number(property.defaultGarbageFee) || 0);
      }

      let recurringChargesTotal = 0;
      for (const charge of charges) {
        let applies = false;
        if (charge.appliesTo === "ALL_UNITS") {
          applies = true;
        } else if (charge.appliesTo === "SPECIFIC_UNITS") {
          const units = Array.isArray(charge.specificUnits) ? charge.specificUnits : JSON.parse(charge.specificUnits || "[]");
          applies = units.includes(tenant.unitId);
        } else if (charge.appliesTo === "UNIT_TYPES") {
          const types = Array.isArray(charge.unitTypes) ? charge.unitTypes : JSON.parse(charge.unitTypes || "[]");
          applies = types.includes(tenant.unitType);
        }
        if (applies) recurringChargesTotal += Number(charge.amount);
      }

      const totalAmount = rentAmount + waterAmount + garbageAmount + recurringChargesTotal;
      const billId = `bill_${Date.now()}_${tenant.id}`;

      await db.$executeRawUnsafe(`
        INSERT INTO monthly_bills (
          id, "tenantId", "unitId", month, "rentAmount", "waterAmount", "garbageAmount",
          "totalAmount", status, "dueDate", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          'UNPAID'::"BillStatus", $9, $10, $10
        )
      `, billId, tenant.id, tenant.unitId, billMonthStart,
         rentAmount, waterAmount, garbageAmount, totalAmount,
         new Date(year, month - 1, 5), now);

      generatedBills.push({
        billId,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        unitNumber: tenant.unitNumber,
        totalAmount,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedBills.length} bills successfully`,
      generatedBills,
      skippedTenants,
    });
  } catch (error: any) {
    console.error("❌ Error generating bills:", error);
    return NextResponse.json({ error: "Failed to generate bills" }, { status: 500 });
  }
}
