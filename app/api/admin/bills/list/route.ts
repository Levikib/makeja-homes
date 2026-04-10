import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const propertyId = searchParams.get("propertyId") || "all";
    const month = searchParams.get("month");

    const db = getPrismaForRequest(request);

    const conditions: string[] = [];
    const args: any[] = [];
    let idx = 1;

    if (status !== "all") {
      conditions.push(`mb.status::text = $${idx++}`);
      args.push(status);
    }

    if (propertyId !== "all") {
      conditions.push(`p.id = $${idx++}`);
      args.push(propertyId);
    }

    if (month) {
      const monthDate = new Date(month);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      conditions.push(`mb.month >= $${idx++} AND mb.month < $${idx++}`);
      args.push(monthStart, monthEnd);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const bills = await db.$queryRawUnsafe<any[]>(`
      SELECT mb.id, mb.month, mb."rentAmount", mb."waterAmount", mb."garbageAmount",
        mb."totalAmount", mb.status::text AS status, mb."dueDate", mb."paidDate", mb."createdAt",
        u."firstName", u."lastName", u.email,
        un."unitNumber", p.name AS "propertyName"
      FROM monthly_bills mb
      JOIN tenants t ON t.id = mb."tenantId"
      JOIN users u ON u.id = t."userId"
      JOIN units un ON un.id = t."unitId"
      JOIN properties p ON p.id = un."propertyId"
      ${where}
      ORDER BY mb."createdAt" DESC
    `, ...args);

    const formattedBills = bills.map((bill) => ({
      id: bill.id,
      tenant: {
        firstName: bill.firstName,
        lastName: bill.lastName,
        email: bill.email,
      },
      unit: {
        unitNumber: bill.unitNumber,
      },
      property: {
        name: bill.propertyName,
      },
      month: bill.month,
      rentAmount: Number(bill.rentAmount),
      waterAmount: Number(bill.waterAmount),
      garbageAmount: Number(bill.garbageAmount),
      totalAmount: Number(bill.totalAmount),
      status: bill.status,
      dueDate: bill.dueDate,
      paidDate: bill.paidDate,
      createdAt: bill.createdAt,
    }));

    return NextResponse.json({ bills: formattedBills });
  } catch (error: any) {
    console.error("❌ Error fetching bills:", error);
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 });
  }
}
