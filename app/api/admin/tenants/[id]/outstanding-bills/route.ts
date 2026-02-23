import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "ADMIN" && payload.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const bills = await prisma.monthly_bills.findMany({
      where: { tenantId: params.id, status: { in: ["PENDING", "OVERDUE"] } },
      select: { id: true, month: true, rentAmount: true, waterAmount: true, garbageAmount: true, totalAmount: true, status: true, dueDate: true, createdAt: true },
      orderBy: { dueDate: "asc" }
    });

    return NextResponse.json({ success: true, bills });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch tenant bills" }, { status: 500 });
  }
}
