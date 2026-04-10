import { jwtVerify } from "jose"
import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
      if (!["ADMIN","MANAGER"].includes(payload.role as string)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ninetyDaysFromNow = new Date(today);
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const db = getPrismaForRequest(request);

    const leases = await db.$queryRawUnsafe<any[]>(`
      SELECT la.id, la."startDate", la."endDate", la."rentAmount", la."depositAmount",
        la.status::text AS status,
        u."firstName", u."lastName", u.email,
        un."unitNumber", un.type::text AS "unitType",
        p.id AS "propertyId", p.name AS "propertyName", p.address
      FROM lease_agreements la
      JOIN tenants t ON t.id = la."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = la."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE la.status::text = 'ACTIVE'
        AND la."endDate" >= $1
        AND la."endDate" <= $2
      ORDER BY la."endDate" ASC
    `, today, ninetyDaysFromNow);

    const categorized = { critical: [] as any[], warning: [] as any[], info: [] as any[] };

    for (const lease of leases) {
      const daysRemaining = Math.ceil((new Date(lease.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const leaseData = {
        ...lease,
        daysRemaining,
        units: { unitNumber: lease.unitNumber, type: lease.unitType, properties: { id: lease.propertyId, name: lease.propertyName, address: lease.address } },
        tenants: { users: { firstName: lease.firstName, lastName: lease.lastName, email: lease.email } },
      };

      if (daysRemaining <= 30) categorized.critical.push(leaseData);
      else if (daysRemaining <= 60) categorized.warning.push(leaseData);
      else categorized.info.push(leaseData);
    }

    return NextResponse.json({ total: leases.length, categorized });
  } catch (error) {
    console.error("Error fetching expiring leases:", error);
    return NextResponse.json({ error: "Failed to fetch expiring leases" }, { status: 500 });
  }
}
