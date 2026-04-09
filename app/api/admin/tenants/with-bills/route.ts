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
    if (!["ADMIN", "MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = getPrismaForRequest(request);

    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT DISTINCT ON (t.id)
        t.id, u."firstName", u."lastName", u.email,
        un."unitNumber", p.name AS "propertyName"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      JOIN monthly_bills mb ON mb."tenantId" = t.id
      WHERE mb.status::text IN ('PENDING', 'OVERDUE')
      ORDER BY t.id, u."firstName" ASC
    `);

    const tenants = rows.map(r => ({
      id: r.id,
      users: { firstName: r.firstName, lastName: r.lastName, email: r.email },
      units: { unitNumber: r.unitNumber, properties: { name: r.propertyName } },
    }));

    return NextResponse.json({ tenants });
  } catch (error: any) {
    console.error("❌ Error fetching tenants with bills:", error?.message);
    return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
  }
}
