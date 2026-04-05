import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) throw new Error("Unauthorized");
  const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
  if (!["ADMIN", "MANAGER"].includes(payload.role as string)) throw new Error("Forbidden");
  return payload;
}

export async function GET(request: NextRequest) {
  try {
    await verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const property = searchParams.get("property");
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const db = getPrismaForRequest(request);

    let where = `WHERE 1=1`;
    const args: any[] = [];
    let idx = 1;

    if (property) { where += ` AND e."propertyId" = $${idx++}`; args.push(property); }
    if (category) { where += ` AND e.category = $${idx++}`; args.push(category); }
    if (startDate && !isNaN(Date.parse(startDate))) { where += ` AND e.date >= $${idx++}`; args.push(new Date(startDate)); }
    if (endDate && !isNaN(Date.parse(endDate))) { where += ` AND e.date <= $${idx++}`; args.push(new Date(endDate)); }
    if (search) { where += ` AND (e.description ILIKE $${idx} OR e.notes ILIKE $${idx})`; args.push(`%${search}%`); idx++; }

    const expenses = await db.$queryRawUnsafe<any[]>(`
      SELECT e.*, p.id as "propId", p.name as "propName"
      FROM expenses e
      JOIN properties p ON p.id = e."propertyId"
      ${where}
      ORDER BY e.date DESC
    `, ...args);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await db.$queryRawUnsafe<any[]>(`
      SELECT
        COALESCE(SUM(amount), 0) as total,
        COUNT(*)::int as count,
        COALESCE(SUM(amount) FILTER (WHERE date >= $1), 0) as month_total,
        COUNT(*) FILTER (WHERE date >= $1)::int as month_count
      FROM expenses
    `, monthStart);

    const s = stats[0];

    return NextResponse.json({
      expenses: expenses.map(e => ({
        ...e,
        properties: { id: e.propId, name: e.propName },
      })),
      stats: {
        totalExpenses: Number(s.total),
        expenseCount: Number(s.count),
        thisMonthTotal: Number(s.month_total),
        thisMonthCount: Number(s.month_count),
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAuth(request);
    const body = await request.json();
    const { amount, category, description, date, propertyId, paymentMethod, notes, receiptUrl } = body;

    if (!amount || !category || !description || !date || !propertyId) {
      return NextResponse.json({ error: "Amount, category, description, date and property are required" }, { status: 400 });
    }
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }
    if (isNaN(Date.parse(date))) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    const prop = await db.$queryRawUnsafe<any[]>(`SELECT id FROM properties WHERE id = $1 LIMIT 1`, propertyId);
    if (!prop.length) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    await db.$executeRawUnsafe(
      `INSERT INTO expenses (id, amount, category, description, date, "propertyId", "paymentMethod", notes, "receiptUrl", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
      id, Number(amount), category, description.trim(), new Date(date), propertyId,
      paymentMethod || null, notes || null, receiptUrl || null, now
    );

    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM expenses WHERE id = $1`, id);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = getPrismaForRequest(request);
    const existing = await db.$queryRawUnsafe<any[]>(`SELECT id FROM expenses WHERE id = $1 LIMIT 1`, id);
    if (!existing.length) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    await db.$executeRawUnsafe(`DELETE FROM expenses WHERE id = $1`, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
