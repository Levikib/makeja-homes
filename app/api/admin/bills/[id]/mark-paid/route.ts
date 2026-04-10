import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { logActivity } from "@/lib/log-activity";

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "ADMIN" && payload.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = getPrismaForRequest(request);
    const now = new Date();

    await db.$executeRawUnsafe(`
      UPDATE monthly_bills
      SET status = 'PAID'::"BillStatus", "paidDate" = $1, "updatedAt" = $1
      WHERE id = $2
    `, now, params.id);

    await logActivity(db, {
      userId: payload.id as string,
      action: "BILL_MARKED_PAID",
      entityType: "monthly_bill",
      entityId: params.id,
      details: { markedAt: now },
    });

    return NextResponse.json({ success: true, bill: { id: params.id, status: "PAID", paidDate: now } });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to mark bill as paid" }, { status: 500 });
  }
}
