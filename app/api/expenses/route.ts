import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) throw new Error("Unauthorized");
  const { payload } = await jwtVerify(token, JWT_SECRET);
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

    const conditions: any[] = [];
    if (property) conditions.push({ propertyId: property });
    if (category) conditions.push({ category });
    if (startDate && !isNaN(Date.parse(startDate))) conditions.push({ date: { gte: new Date(startDate) } });
    if (endDate && !isNaN(Date.parse(endDate))) conditions.push({ date: { lte: new Date(endDate) } });
    if (search) {
      conditions.push({
        OR: [
          { description: { contains: search, mode: "insensitive" } },
          { notes: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const expenses = await prisma.expenses.findMany({
      where: conditions.length > 0 ? { AND: conditions } : undefined,
      include: { properties: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error: any) {
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
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

    // Verify property exists
    const property = await prisma.properties.findUnique({ where: { id: propertyId } });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const expense = await prisma.expenses.create({
      data: {
        id: crypto.randomUUID(),
        amount: Number(amount),
        category,
        description: description.trim(),
        date: new Date(date),
        propertyId,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
        receiptUrl: receiptUrl || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(expense, { status: 201 });
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

    const existing = await prisma.expenses.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    await prisma.expenses.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
