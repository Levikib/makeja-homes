import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

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

    // Build dynamic where clause
    const where: any = {};

    if (propertyId && propertyId !== "all") {
      where.units = { propertyId };
    }

    if (monthFilter && yearFilter) {
      where.month = new Date(parseInt(yearFilter), parseInt(monthFilter) - 1, 1);
    }

    const allFees = await prisma.garbage_fees.findMany({
      where,
      select: { amount: true, status: true },
    });

    const totalInvoices = allFees.length;
    const totalCollected = allFees
      .filter(f => f.status === "PAID")
      .reduce((sum, f) => sum + f.amount, 0);
    const totalPending = allFees
      .filter(f => f.status === "PENDING")
      .reduce((sum, f) => sum + f.amount, 0);
    const paidCount = allFees.filter(f => f.status === "PAID").length;
    const pendingCount = allFees.filter(f => f.status === "PENDING").length;

    return NextResponse.json({
      success: true,
      stats: {
        totalInvoices,
        totalCollected,
        totalPending,
        paidCount,
        pendingCount,
      }
    });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
