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
      SELECT t.id, t."unitId", t."rentAmount",
        u."firstName", u."lastName", u.email,
        un."unitNumber", un.type::text AS "unitType"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      WHERE un."propertyId" = $1 AND un.status::text = 'OCCUPIED'
    `, propertyId);

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

    const tenantIds = tenants.map((t: any) => t.id);

    if (tenantIds.length === 0) {
      return NextResponse.json({ preview: [], summary: { totalTenants: 0, tenantsWithExistingBills: 0, newBillsToGenerate: 0, totalAmount: 0 } });
    }

    const placeholders = tenantIds.map((_: any, i: number) => `$${i + 3}`).join(", ");

    // Batch: existing bills
    const existingBills = await db.$queryRawUnsafe<any[]>(`
      SELECT "tenantId" FROM monthly_bills
      WHERE month >= $1 AND month < $2 AND "tenantId" IN (${placeholders})
    `, billMonthStart, billMonthEnd, ...tenantIds);
    const existingBillSet = new Set(existingBills.map((b: any) => b.tenantId));

    // Batch: water readings
    const waterRows = await db.$queryRawUnsafe<any[]>(`
      SELECT "tenantId", "amountDue" FROM water_readings
      WHERE month = $1 AND year = $2 AND "tenantId" IN (${placeholders})
    `, month, year, ...tenantIds);
    const waterMap: Record<string, number> = {};
    for (const r of waterRows) waterMap[r.tenantId] = Number(r.amountDue);

    // Batch: garbage fees
    const garbageRows = await db.$queryRawUnsafe<any[]>(`
      SELECT "tenantId", amount FROM garbage_fees
      WHERE month >= $1 AND month < $2 AND "tenantId" IN (${placeholders})
    `, billMonthStart, billMonthEnd, ...tenantIds);
    const garbageMap: Record<string, number> = {};
    for (const r of garbageRows) garbageMap[r.tenantId] = Number(r.amount);

    const preview = tenants.map((tenant: any) => {
      const rentAmount = Number(tenant.rentAmount) || 0;
      const waterAmount = waterMap[tenant.id] ?? 0;
      let garbageAmount = 0;
      if (property.chargesGarbageFee) {
        garbageAmount = garbageMap[tenant.id] ?? (Number(property.defaultGarbageFee) || 0);
      }

      const applicableCharges: { name: string; amount: number }[] = [];
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
        if (applies) {
          recurringChargesTotal += Number(charge.amount);
          applicableCharges.push({ name: charge.name, amount: Number(charge.amount) });
        }
      }

      const total = rentAmount + waterAmount + garbageAmount + recurringChargesTotal;

      return {
        tenant: { id: tenant.id, name: `${tenant.firstName} ${tenant.lastName}`, email: tenant.email },
        unit: { number: tenant.unitNumber },
        breakdown: { rent: rentAmount, water: waterAmount, garbage: garbageAmount, recurringCharges: applicableCharges, recurringChargesTotal, total },
        billExists: existingBillSet.has(tenant.id),
      };
    });

    return NextResponse.json({
      preview,
      summary: {
        totalTenants: preview.length,
        tenantsWithExistingBills: preview.filter((p: any) => p.billExists).length,
        newBillsToGenerate: preview.filter((p: any) => !p.billExists).length,
        totalAmount: preview.reduce((sum: number, p: any) => sum + p.breakdown.total, 0),
      },
    });
  } catch (error: any) {
    console.error("❌ Error generating bill preview:", error);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}
