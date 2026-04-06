import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (!["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const propertyId = params.id;
    const db = getPrismaForRequest(request);

    const payments = await db.$queryRawUnsafe<any[]>(`
      SELECT p.id, p.amount, p.status, p."paymentMethod", p."proofOfPaymentUrl",
        p."verificationStatus", p."verifiedAt", p."createdAt",
        t.id as "tenantId",
        u."firstName", u."lastName", u.email,
        un."unitNumber",
        vu."firstName" as "verifiedByFirst", vu."lastName" as "verifiedByLast"
      FROM payments p
      JOIN tenants t ON t.id = p."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      LEFT JOIN users vu ON vu.id = p."verifiedById"
      WHERE un."propertyId" = $1
        AND p."proofOfPaymentUrl" IS NOT NULL
      ORDER BY p."createdAt" DESC
    `, propertyId);

    return NextResponse.json({
      payments: payments.map(p => ({
        id: p.id, amount: p.amount, status: p.status,
        paymentMethod: p.paymentMethod,
        proofOfPaymentUrl: p.proofOfPaymentUrl,
        verificationStatus: p.verificationStatus,
        verifiedAt: p.verifiedAt, createdAt: p.createdAt,
        tenants: {
          users: { firstName: p.firstName, lastName: p.lastName, email: p.email },
          units: { unitNumber: p.unitNumber },
        },
        users_payments_verifiedByIdTousers: p.verifiedByFirst
          ? { firstName: p.verifiedByFirst, lastName: p.verifiedByLast }
          : null,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
