import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

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

    const bills = await prisma.monthly_bills.findMany({
      where: {
        tenantId,
        status: { in: ["PENDING", "OVERDUE", "UNPAID"] },
      },
      orderBy: { month: "asc" },
    });

    const formatted = bills.map((b) => {
      const monthDate = new Date(b.month);
      const monthLabel = monthDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      return {
        id: b.id,
        month: b.month,
        monthLabel,
        rentAmount: b.rentAmount,
        waterAmount: b.waterAmount,
        garbageAmount: b.garbageAmount,
        totalAmount: b.totalAmount,
        status: b.status,
        dueDate: b.dueDate,
      };
    });

    return NextResponse.json({ bills: formatted });
  } catch (error: any) {
    console.error("❌ Error fetching outstanding bills:", error.message);
    return NextResponse.json({ error: "Failed to fetch outstanding bills" }, { status: 500 });
  }
}
