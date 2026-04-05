import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

async function authGuard(request: NextRequest, roles = ["ADMIN", "MANAGER"]) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    if (!roles.includes(payload.role as string)) return null;
    return payload;
  } catch { return null; }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authGuard(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getPrismaForRequest(request);
    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT la.*,
        t.id as "tenantRecordId", t."userId",
        usr."firstName", usr."lastName", usr.email, usr."phoneNumber",
        u."unitNumber", u."propertyId",
        p.id as "propId", p.name as "propName", p.city as "propCity"
      FROM lease_agreements la
      JOIN tenants t ON t.id = la."tenantId"
      JOIN users usr ON usr.id = t."userId"
      JOIN units u ON u.id = la."unitId"
      JOIN properties p ON p.id = u."propertyId"
      WHERE la.id = $1 LIMIT 1
    `, params.id);

    if (!rows.length) return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    const r = rows[0];

    return NextResponse.json({
      id: r.id, tenantId: r.tenantId, unitId: r.unitId,
      status: r.status, startDate: r.startDate, endDate: r.endDate,
      rentAmount: r.rentAmount, depositAmount: r.depositAmount,
      terms: r.terms, contractTerms: r.contractTerms,
      paymentDueDay: r.paymentDueDay, lateFeeGraceDays: r.lateFeeGraceDays, lateFeeAmount: r.lateFeeAmount,
      contractSentAt: r.contractSentAt, contractViewedAt: r.contractViewedAt,
      contractSignedAt: r.contractSignedAt, signatureToken: r.signatureToken,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
      tenants: {
        id: r.tenantRecordId,
        users: { firstName: r.firstName, lastName: r.lastName, email: r.email, phoneNumber: r.phoneNumber },
      },
      units: {
        unitNumber: r.unitNumber, propertyId: r.propertyId,
        properties: { id: r.propId, name: r.propName, city: r.propCity },
      },
    });
  } catch (error) {
    console.error("Error fetching lease:", error);
    return NextResponse.json({ error: "Failed to fetch lease" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authGuard(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await request.json();
    const db = getPrismaForRequest(request);
    const now = new Date();

    await db.$executeRawUnsafe(
      `UPDATE lease_agreements SET "startDate"=$2, "endDate"=$3, "rentAmount"=$4, "depositAmount"=$5, terms=$6, "contractTerms"=$7, "updatedAt"=$8 WHERE id=$1`,
      params.id,
      new Date(data.startDate), new Date(data.endDate),
      parseFloat(data.rentAmount), parseFloat(data.depositAmount),
      data.terms || null, data.contractTerms || null, now
    );

    return GET(request, { params });
  } catch (error) {
    console.error("Error updating lease:", error);
    return NextResponse.json({ error: "Failed to update lease" }, { status: 500 });
  }
}
