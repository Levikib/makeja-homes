import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPrismaForTenant } from "@/lib/prisma";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    console.log("📋 Fetching payment history for user:", userId);

    // Get tenant
    const tenant = await getPrismaForTenant(request).tenants.findFirst({
      where: { userId },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant record not found" },
        { status: 404 }
      );
    }

    // Get all payments
    const payments = await getPrismaForTenant(request).payments.findMany({
      where: {
        tenantId: tenant.id,
      },
      orderBy: {
        paymentDate: "desc",
      },
    });

    const formattedPayments = payments.map((p) => ({
      id: p.id,
      referenceNumber: p.referenceNumber,
      amount: Number(p.amount),
      paymentType: p.paymentType,
      paymentMethod: p.paymentMethod,
      status: p.status,
      paymentDate: p.paymentDate,
      notes: p.notes,
      receiptUrl: p.receiptUrl,
    }));

    return NextResponse.json({
      payments: formattedPayments,
      totalPaid: formattedPayments
        .filter((p) => p.status === "COMPLETED" || p.status === "VERIFIED")
        .reduce((sum, p) => sum + p.amount, 0),
    });
  } catch (error: any) {
    console.error("❌ Error fetching payment history:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}