import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;
    const companyId = payload.companyId as string | null;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get date range (default: current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Build where clause for company isolation
    const whereClause = companyId ? {
      properties: {
        companyId: companyId
      }
    } : {};

    // Total Revenue (this month, completed payments)
    const totalRevenue = await prisma.payments.aggregate({
      where: {
        ...whereClause,
        status: "COMPLETED",
        paymentDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Pending Verification (manual payments)
    const pendingPayments = await prisma.payments.aggregate({
      where: {
        ...whereClause,
        verificationStatus: "PENDING",
        paymentMethod: {
          in: ["M_PESA", "BANK_TRANSFER", "CASH"],
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // Overdue Bills (monthly_bills past due date)
    const overdueBills = await prisma.monthly_bills.aggregate({
      where: {
        status: "PENDING",
        dueDate: {
          lt: now,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Collection Rate (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const totalBilled = await prisma.monthly_bills.aggregate({
      where: {
        dueDate: {
          gte: thirtyDaysAgo,
          lte: now,
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    const totalCollected = await prisma.payments.aggregate({
      where: {
        ...whereClause,
        status: "COMPLETED",
        paymentDate: {
          gte: thirtyDaysAgo,
          lte: now,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const collectionRate = totalBilled._sum.totalAmount && totalBilled._sum.totalAmount > 0
      ? ((totalCollected._sum.amount || 0) / totalBilled._sum.totalAmount) * 100
      : 0;

    return NextResponse.json({
      stats: {
        totalRevenue: totalRevenue._sum.amount || 0,
        pendingPayments: {
          count: pendingPayments._count.id || 0,
          amount: pendingPayments._sum.amount || 0,
        },
        overduePayments: {
          count: overdueBills._count.id || 0,
          amount: overdueBills._sum.totalAmount || 0,
        },
        collectionRate: Math.round(collectionRate),
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching payment stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment stats" },
      { status: 500 }
    );
  }
}
