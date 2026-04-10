import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function GET(request: NextRequest) {
  try {
    // Auth required — ADMIN, MANAGER, CARETAKER only
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { payload } = await jwtVerify(token, JWT_SECRET)
    const role = payload.role as string
    if (!role || !["ADMIN", "MANAGER", "CARETAKER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const propertyId = searchParams.get("propertyId");

    const db = getPrismaForRequest(request);

    let whereClause = `WHERE 1=1`;
    const args: any[] = [];
    let idx = 1;

    if (status && status !== "all") {
      whereClause += ` AND la.status::text = $${idx++}`;
      args.push(status);
    }
    if (propertyId) {
      whereClause += ` AND u."propertyId" = $${idx++}`;
      args.push(propertyId);
    }

    const leases = await db.$queryRawUnsafe<any[]>(`
      SELECT la.id, la."tenantId", la."unitId", la.status::text AS status,
        la."startDate", la."endDate",
        la."rentAmount", la."depositAmount", la.terms, la."createdAt", la."updatedAt",
        u."unitNumber", u."propertyId",
        p.id as "propId", p.name as "propName",
        t.id as "tId",
        usr."firstName", usr."lastName", usr.email
      FROM lease_agreements la
      JOIN units un ON un.id = la."unitId"
      JOIN properties p ON p.id = un."propertyId"
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
    return NextResponse.json({ error: "Failed to fetch leases" }, { status: 500 });
  }
}
