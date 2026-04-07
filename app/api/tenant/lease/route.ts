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
    const userId = payload.id as string;

    const db = getPrismaForRequest(request);

    // Tenant + unit + property
    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT
        t.id as "tenantId",
        t."unitId",
        t."leaseStartDate",
        t."leaseEndDate",
        t."rentAmount",
        t."depositAmount",
        u."firstName",
        u."lastName",
        u.email,
        u."phoneNumber",
        un."unitNumber",
        un.type::text as "unitType",
        un.bedrooms,
        un.bathrooms,
        p.name as "propertyName",
        p.address as "propertyAddress",
        p.city as "propertyCity",
        p.state as "propertyState",
        p.country as "propertyCountry"
      FROM tenants t
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      WHERE t."userId" = $1
      LIMIT 1
    `, userId);

    if (!tenantRows.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const t = tenantRows[0];

    // Get active lease agreement
    const leaseRows = await db.$queryRawUnsafe<any[]>(`
      SELECT id, status::text, "startDate", "endDate", "rentAmount", "depositAmount",
             terms, "contractTerms", "contractSentAt", "contractViewedAt", "contractSignedAt",
             "signatureToken"
      FROM lease_agreements
      WHERE "tenantId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 1
    `, t.tenantId);

    const la = leaseRows[0] || null;

    const startDate = la?.startDate || t.leaseStartDate;
    const endDate = la?.endDate || t.leaseEndDate;
    const rentAmount = la?.rentAmount || t.rentAmount;
    const depositAmount = la?.depositAmount || t.depositAmount;

    const now = new Date();
    const leaseStart = new Date(startDate);
    const leaseEnd = new Date(endDate);
    const totalDays = Math.ceil((leaseEnd.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = totalDays - remainingDays;
    const percentComplete = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

    let leaseStatus = "Active";
    if (now < leaseStart) leaseStatus = "Upcoming";
    else if (now > leaseEnd) leaseStatus = "Expired";
    else if (remainingDays <= 30) leaseStatus = "Expiring Soon";

    return NextResponse.json({
      id: la?.id || t.tenantId,
      status: leaseStatus,
      startDate,
      endDate,
      rentAmount,
      depositAmount,
      terms: la?.terms || null,
      contractTerms: la?.contractTerms || null,
      totalDays,
      remainingDays: remainingDays > 0 ? remainingDays : 0,
      elapsedDays: elapsedDays > 0 ? elapsedDays : 0,
      percentComplete: Math.round(percentComplete),
      contractSentAt: la?.contractSentAt || null,
      contractViewedAt: la?.contractViewedAt || null,
      contractSignedAt: la?.contractSignedAt || null,
      isSigned: !!la?.contractSignedAt,
      hasDigitalContract: !!la,
      tenant: {
        name: `${t.firstName} ${t.lastName}`,
        email: t.email,
        phone: t.phoneNumber,
      },
      property: {
        name: t.propertyName,
        address: t.propertyAddress,
        city: t.propertyCity,
        state: t.propertyState,
        country: t.propertyCountry,
      },
      unit: {
        unitNumber: t.unitNumber,
        type: t.unitType,
        bedrooms: t.bedrooms,
        bathrooms: t.bathrooms,
      },
    });

  } catch (error: any) {
    console.error("❌ Tenant lease error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch lease data" }, { status: 500 });
  }
}
