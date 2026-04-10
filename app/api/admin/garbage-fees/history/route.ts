import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);

    const db = getPrismaForRequest(request);

    const fees = await db.$queryRawUnsafe<any[]>(`
      SELECT gf.id, gf.month, gf.amount, gf."isApplicable", gf.status::text AS status, gf."createdAt",
        u."firstName", u."lastName", u.email,
        un."unitNumber",
        p.id AS "propertyId", p.name AS "propertyName"
      FROM garbage_fees gf
      JOIN tenants t ON t.id = gf."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      ORDER BY gf.month DESC
    `);

    const formatted = fees.map(f => ({
      id: f.id,
      month: f.month,
      amount: Number(f.amount),
      isApplicable: f.isApplicable,
      status: f.status,
      createdAt: f.createdAt,
      tenants: {
        users: { firstName: f.firstName, lastName: f.lastName, email: f.email },
        units: { unitNumber: f.unitNumber, properties: { id: f.propertyId, name: f.propertyName } },
      },
    }));

    return NextResponse.json({ fees: formatted });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
