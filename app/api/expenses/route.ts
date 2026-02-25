import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const property = searchParams.get("property");
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const where: any = {
      AND: [],
    };

    if (property) {
      where.AND.push({ propertyId: property });
    }

    if (category) {
      where.AND.push({ category });
    }

    if (startDate) {
      where.AND.push({ date: { gte: new Date(startDate) } });
    }

    if (endDate) {
      where.AND.push({ date: { lte: new Date(endDate) } });
    }

    if (search) {
      where.AND.push({
        OR: [
          { description: { contains: search, mode: "insensitive" } },
          { notes: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const expenses = await prisma.expenses.findMany({
      where: where.AND.length > 0 ? where : undefined,
      include: {
        properties: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      amount,
      category,
      description,
      date,
      propertyId,
      paymentMethod,
      notes,
      receiptUrl,
    } = body;

    const expense = await prisma.expenses.create({
      data: {
        id: crypto.randomUUID(),
        amount,
        category,
        description,
        date: new Date(date),
        propertyId,
        paymentMethod,
        notes,
        receiptUrl,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.expenses.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
