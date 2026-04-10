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

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const monthFilter = searchParams.get("month");
    const yearFilter = searchParams.get("year");

    const db = getPrismaForRequest(request);

    const conditions: string[] = [];
    const args: any[] = [];
    let idx = 1;

    if (propertyId && propertyId !== "all") {
      conditions.push(`un."propertyId" = $${idx++}`);
      args.push(propertyId);
    }

    if (monthFilter && yearFilter) {
      const filterDate = new Date(parseInt(yearFilter), parseInt(monthFilter) - 1, 1);
      const filterDateEnd = new Date(parseInt(yearFilter), parseInt(monthFilter), 1);
      conditions.push(`gf.month >= $${idx++} AND gf.month < $${idx++}`);
      args.push(filterDate, filterDateEnd);
    }

    const joinClause = (propertyId && propertyId !== "all")
      ? `JOIN tenants t ON t.id = gf."tenantId" JOIN units un ON un.id = t."unitId"`
      : "";
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const allFees = await db.$queryRawUnsafe<any[]>(`
      SELECT gf.amount, gf.status::text AS status
      FROM garbage_fees gf
      ${joinClause}
      ${where}
    `, ...args);

    const totalInvoices = allFees.length;
    const totalCollected = allFees.filter(f => f.status === "PAID").reduce((sum, f) => sum + Number(f.amount), 0);
    const totalPending = allFees.filter(f => f.status === "PENDING").reduce((sum, f) => sum + Number(f.amount), 0);
    const paidCount = allFees.filter(f => f.status === "PAID").length;
    const pendingCount = allFees.filter(f => f.status === "PENDING").length;

    return NextResponse.json({
      success: true,
      stats: { totalInvoices, totalCollected, totalPending, paidCount, pendingCount },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
