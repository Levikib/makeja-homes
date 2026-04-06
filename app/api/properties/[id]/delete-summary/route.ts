import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    if (payload.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const db = getPrismaForRequest(request);

    const [propRows, unitRows, tenantRows, leaseRows, paymentRows, maintenanceRows] = await Promise.all([
      db.$queryRawUnsafe<any[]>(`SELECT id, name FROM properties WHERE id = $1 LIMIT 1`, params.id),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as count FROM units WHERE "propertyId" = $1 AND "deletedAt" IS NULL`, params.id),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as count FROM tenants t JOIN units u ON u.id = t."unitId" WHERE u."propertyId" = $1`, params.id),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as count FROM lease_agreements la JOIN units u ON u.id = la."unitId" WHERE u."propertyId" = $1 AND la.status = 'ACTIVE'`, params.id),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as count FROM payments p JOIN tenants t ON t.id = p."tenantId" JOIN units u ON u.id = t."unitId" WHERE u."propertyId" = $1`, params.id),
      db.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as count FROM maintenance_requests WHERE "unitId" IN (SELECT id FROM units WHERE "propertyId" = $1)`, params.id),
    ]);

    if (!propRows.length) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    return NextResponse.json({
      property: propRows[0],
      summary: {
        units: Number(unitRows[0].count),
        tenants: Number(tenantRows[0].count),
        activeLeases: Number(leaseRows[0].count),
        payments: Number(paymentRows[0].count),
        maintenanceRequests: Number(maintenanceRows[0].count),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
