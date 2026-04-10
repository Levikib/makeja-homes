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
    await jwtVerify(token, secret);

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    // Get tenant + user + unit + property info
    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT t.id, t."unitId", t."createdAt",
        u."firstName", u."lastName", u.email,
        un."unitNumber", p.name AS "propertyName"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t.id = $1 LIMIT 1
    `, tenantId);

    if (tenantRows.length === 0) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const t = tenantRows[0];

    // Active lease start date
    const leaseRows = await db.$queryRawUnsafe<any[]>(`
      SELECT id, "startDate", "endDate", status::text AS status
      FROM lease_agreements
      WHERE "tenantId" = $1 AND status::text = 'ACTIVE'
      ORDER BY "startDate" ASC LIMIT 1
    `, tenantId);

    // Water readings
    const waterRows = await db.$queryRawUnsafe<any[]>(`
      SELECT id, month, year, "previousReading", "currentReading",
             "unitsConsumed", "ratePerUnit", "amountDue", "readingDate"
      FROM water_readings
      WHERE "tenantId" = $1
      ORDER BY year DESC, month DESC
    `, tenantId);

    // Garbage fees
    const garbageRows = await db.$queryRawUnsafe<any[]>(`
      SELECT id, month, amount, "isApplicable", status::text AS status, "createdAt"
      FROM garbage_fees
      WHERE "tenantId" = $1
      ORDER BY month DESC
    `, tenantId);

    const tenant = {
      id: t.id,
      unitId: t.unitId,
      createdAt: t.createdAt,
      users: { firstName: t.firstName, lastName: t.lastName, email: t.email },
      units: { unitNumber: t.unitNumber, properties: { name: t.propertyName } },
      lease_agreements: leaseRows,
      water_readings: waterRows,
      garbage_fees: garbageRows,
    };

    return NextResponse.json({ tenant });
  } catch (error: any) {
    console.error("❌ Error fetching tenant history:", error);
    return NextResponse.json({ error: "Failed to fetch tenant history" }, { status: 500 });
  }
}
