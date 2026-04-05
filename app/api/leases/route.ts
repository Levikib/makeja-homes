import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const propertyId = searchParams.get("propertyId");

    const db = getPrismaForRequest(request);

    let whereClause = `WHERE 1=1`;
    const args: any[] = [];
    let idx = 1;

    if (status && status !== "all") {
      whereClause += ` AND la.status = $${idx++}`;
      args.push(status);
    }
    if (propertyId) {
      whereClause += ` AND u."propertyId" = $${idx++}`;
      args.push(propertyId);
    }

    const leases = await db.$queryRawUnsafe<any[]>(`
      SELECT la.id, la."tenantId", la."unitId", la.status, la."startDate", la."endDate",
        la."rentAmount", la."depositAmount", la.terms, la."createdAt", la."updatedAt",
        u."unitNumber", u."propertyId",
        p.id as "propId", p.name as "propName",
        t.id as "tId",
        usr."firstName", usr."lastName", usr.email
      FROM lease_agreements la
      JOIN units u ON u.id = la."unitId"
      JOIN properties p ON p.id = u."propertyId"
      JOIN tenants t ON t.id = la."tenantId"
      JOIN users usr ON usr.id = t."userId"
      ${whereClause}
      ORDER BY la."startDate" DESC
    `, ...args);

    const formatted = leases.map(la => ({
      id: la.id, tenantId: la.tenantId, unitId: la.unitId, status: la.status,
      startDate: la.startDate, endDate: la.endDate,
      monthlyRent: la.rentAmount, rentAmount: la.rentAmount,
      depositAmount: la.depositAmount, terms: la.terms,
      createdAt: la.createdAt, updatedAt: la.updatedAt,
      unit: { id: la.unitId, unitNumber: la.unitNumber, propertyId: la.propertyId, property: { id: la.propId, name: la.propName } },
      tenant: { id: la.tId, user: { firstName: la.firstName, lastName: la.lastName, email: la.email } },
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching leases:", error);
    return NextResponse.json({ error: "Failed to fetch leases", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
