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
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (!["ADMIN", "MANAGER"].includes(payload.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = getPrismaForRequest(request);

    const bills = await db.$queryRawUnsafe<any[]>(`
      SELECT id, month, "rentAmount", "waterAmount", "garbageAmount",
             "totalAmount", status::text AS status, "dueDate"
      FROM monthly_bills
      WHERE "tenantId" = $1
        AND status::text IN ('PENDING', 'OVERDUE', 'UNPAID')
      ORDER BY month ASC
    `, params.id);

    const formatted = bills.map(b => ({
      id: b.id,
      month: b.month,
      monthLabel: new Date(b.month).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      rentAmount: Number(b.rentAmount),
      waterAmount: Number(b.waterAmount),
      garbageAmount: Number(b.garbageAmount),
      totalAmount: Number(b.totalAmount),
      status: b.status,
      dueDate: b.dueDate,
    }));

    return NextResponse.json({ bills: formatted });
  } catch (error: any) {
    console.error("❌ Error fetching outstanding bills:", error?.message);
    return NextResponse.json({ error: "Failed to fetch outstanding bills" }, { status: 500 });
  }
}
