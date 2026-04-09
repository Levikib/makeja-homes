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
    if (!["ADMIN", "MANAGER", "CARETAKER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = getPrismaForRequest(request);

    const tenants = await db.$queryRawUnsafe<any[]>(`
      SELECT
        t.id, t."unitId", t."createdAt",
        u."firstName", u."lastName", u.email,
        un."unitNumber", un.status::text AS "unitStatus",
        p.id AS "propertyId", p.name AS "propertyName"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE un.status::text = 'OCCUPIED'
      ORDER BY t."createdAt" DESC
    `);

    // Water readings per tenant (last 24)
    const tenantIds = tenants.map(t => t.id);
    let waterMap: Record<string, any[]> = {};
    let garbageMap: Record<string, any[]> = {};
    let leaseMap: Record<string, any[]> = {};

    if (tenantIds.length > 0) {
      const placeholders = tenantIds.map((_, i) => `$${i + 1}`).join(", ");

      const waterRows = await db.$queryRawUnsafe<any[]>(`
        SELECT id, "tenantId", month, year, "previousReading", "currentReading",
               "unitsConsumed", "ratePerUnit", "amountDue", "readingDate"
        FROM water_readings
        WHERE "tenantId" IN (${placeholders})
        ORDER BY "readingDate" DESC
      `, ...tenantIds);
      for (const r of waterRows) {
        if (!waterMap[r.tenantId]) waterMap[r.tenantId] = [];
        if (waterMap[r.tenantId].length < 24) waterMap[r.tenantId].push(r);
      }

      const garbageRows = await db.$queryRawUnsafe<any[]>(`
        SELECT id, "tenantId", month, amount, "isApplicable", status::text AS status, "createdAt"
        FROM garbage_fees
        WHERE "tenantId" IN (${placeholders})
        ORDER BY "createdAt" DESC
      `, ...tenantIds);
      for (const r of garbageRows) {
        if (!garbageMap[r.tenantId]) garbageMap[r.tenantId] = [];
        if (garbageMap[r.tenantId].length < 24) garbageMap[r.tenantId].push(r);
      }

      const leaseRows = await db.$queryRawUnsafe<any[]>(`
        SELECT id, "tenantId", "startDate", "endDate", status::text AS status
        FROM lease_agreements
        WHERE "tenantId" IN (${placeholders}) AND status::text = 'ACTIVE'
      `, ...tenantIds);
      for (const r of leaseRows) {
        if (!leaseMap[r.tenantId]) leaseMap[r.tenantId] = [];
        leaseMap[r.tenantId].push(r);
      }
    }

    const result = tenants.map(t => ({
      id: t.id,
      unitId: t.unitId,
      createdAt: t.createdAt,
      users: { firstName: t.firstName, lastName: t.lastName, email: t.email },
      units: { unitNumber: t.unitNumber, status: t.unitStatus, properties: { id: t.propertyId, name: t.propertyName } },
      water_readings: waterMap[t.id] ?? [],
      garbage_fees: garbageMap[t.id] ?? [],
      lease_agreements: leaseMap[t.id] ?? [],
    }));

    return NextResponse.json({ tenants: result });
  } catch (error: any) {
    console.error("❌ Error fetching active tenants:", error?.message);
    return NextResponse.json({ error: "Failed to fetch active tenants" }, { status: 500 });
  }
}
