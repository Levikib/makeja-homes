import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// GET /api/payments/stats - Get payment statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    // Date filters
    const startDate = month 
      ? new Date(parseInt(year), parseInt(month) - 1, 1)
      : new Date(parseInt(year), 0, 1);
    
    const endDate = month
      ? new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
      : new Date(parseInt(year), 11, 31, 23, 59, 59);

    // Get all payments for the period
    const payments = await prisma.payments.findMany({
      where: {
        deletedAt: null,
        paymentDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Calculate statistics
    const stats = {
      totalCollected: payments
        .filter(p => p.status === "COMPLETED")
        .reduce((sum, p) => sum + p.amount, 0),
      
      pending: payments
        .filter(p => p.status === "PENDING")
        .reduce((sum, p) => sum + p.amount, 0),
      
      failed: payments
        .filter(p => p.status === "FAILED")
        .reduce((sum, p) => sum + p.amount, 0),
      
      totalTransactions: payments.length,
      
      completedTransactions: payments.filter(p => p.status === "COMPLETED").length,
      
      pendingTransactions: payments.filter(p => p.status === "PENDING").length,
      
      // By payment type
      byType: {
        rent: payments.filter(p => p.paymentType === "RENT").reduce((sum, p) => sum + p.amount, 0),
        deposit: payments.filter(p => p.paymentType === "DEPOSIT").reduce((sum, p) => sum + p.amount, 0),
        utility: payments.filter(p => p.paymentType === "UTILITY").reduce((sum, p) => sum + p.amount, 0),
        maintenance: payments.filter(p => p.paymentType === "MAINTENANCE").reduce((sum, p) => sum + p.amount, 0),
        lateFee: payments.filter(p => p.paymentType === "LATE_FEE").reduce((sum, p) => sum + p.amount, 0),
        other: payments.filter(p => p.paymentType === "OTHER").reduce((sum, p) => sum + p.amount, 0)
      },
      
      // By payment method
      byMethod: {
        cash: payments.filter(p => p.paymentMethod === "CASH").reduce((sum, p) => sum + p.amount, 0),
        bankTransfer: payments.filter(p => p.paymentMethod === "BANK_TRANSFER").reduce((sum, p) => sum + p.amount, 0),
        mPesa: payments.filter(p => p.paymentMethod === "M_PESA").reduce((sum, p) => sum + p.amount, 0),
        mobileMoney: payments.filter(p => p.paymentMethod === "MOBILE_MONEY").reduce((sum, p) => sum + p.amount, 0),
        paystack: payments.filter(p => p.paymentMethod === "PAYSTACK").reduce((sum, p) => sum + p.amount, 0),
        cheque: payments.filter(p => p.paymentMethod === "CHEQUE").reduce((sum, p) => sum + p.amount, 0),
        other: payments.filter(p => p.paymentMethod === "OTHER").reduce((sum, p) => sum + p.amount, 0)
      },
      
      // Collection rate
      collectionRate: payments.length > 0 
        ? ((payments.filter(p => p.status === "COMPLETED").length / payments.length) * 100).toFixed(1)
        : 0,
      
      // Average payment amount
      averagePayment: payments.length > 0
        ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length
        : 0
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment statistics" },
      { status: 500 }
    );
  }
}
