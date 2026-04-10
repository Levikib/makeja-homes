import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const data = await request.json();

    const db = getPrismaForRequest(request);

    // Get tenant to find unitId
    const tenantRows = await db.$queryRawUnsafe<any[]>(`
      SELECT id, "unitId" FROM tenants WHERE id = $1 LIMIT 1
    `, data.tenantId);

    if (tenantRows.length === 0) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const tenant = tenantRows[0];

    const paymentId = crypto.randomUUID();
    const now = new Date();
    const referenceNumber = data.referenceNumber || `PAY-${Date.now()}`;
    const paymentDate = data.paymentDate ? new Date(data.paymentDate) : now;
    const status = data.status || "COMPLETED";
    const paymentType = data.paymentType || "RENT";

    await db.$executeRawUnsafe(`
      INSERT INTO payments (
        id, "tenantId", "unitId", amount,
        "paymentType", "paymentMethod", "transactionId", "referenceNumber",
        "paymentDate", status, "verificationStatus", notes, "createdById",
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4,
        $5::"PaymentType", $6::"PaymentMethod", $7, $8,
        $9, $10::"PaymentStatus", 'APPROVED'::"VerificationStatus", $11, $12,
        $13, $13
      )
    `,
      paymentId, data.tenantId, tenant.unitId, data.amount,
      paymentType, data.paymentMethod, data.transactionId || null, referenceNumber,
      paymentDate, status, data.notes || null, userId,
      now);

    return NextResponse.json({ id: paymentId, tenantId: data.tenantId, unitId: tenant.unitId, amount: data.amount, status });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
