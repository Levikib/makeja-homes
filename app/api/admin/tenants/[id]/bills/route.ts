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
    if (payload.role !== "ADMIN" && payload.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const tenantId = params.id;
    const db = getPrismaForRequest(request);

    // Fetch all non-PAID bills for this tenant
    const bills = await db.$queryRawUnsafe(`
      SELECT id, month, "rentAmount", "waterAmount", "garbageAmount", "totalAmount", status, "dueDate"
      FROM monthly_bills
      WHERE "tenantId" = $1
        AND status::text IN ('PENDING', 'OVERDUE', 'UNPAID')
      ORDER BY month ASC
    `, tenantId) as any[];

    // For each bill, sum payments tagged to it via notes containing bill:<id>
    const result = await Promise.all(bills.map(async (bill: any) => {
      const paidRows = await db.$queryRawUnsafe(`
        SELECT COALESCE(SUM(amount), 0) as paid
        FROM payments
        WHERE status::text IN ('COMPLETED', 'VERIFIED')
          AND notes LIKE $1
      `, `%bill:${bill.id}%`) as any[];

      const amountPaid = Number(paidRows[0]?.paid || 0);
      const totalAmount = Number(bill.totalAmount);
      const balance = Math.max(0, totalAmount - amountPaid);
      const isPartial = amountPaid > 0 && amountPaid < totalAmount;

      return {
        id: bill.id,
        month: bill.month,
        totalAmount,
        amountPaid,
        balance,
        status: bill.status,
        dueDate: bill.dueDate,
        isPartial,
      };
    }));

    return NextResponse.json({ bills: result });
  } catch (error: any) {
    console.error("Error fetching tenant bills:", error?.message);
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 });
  }
}
