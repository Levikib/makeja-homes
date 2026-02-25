import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";


export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;
    if (payload.role !== "ADMIN" && payload.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      tenantId,
      amount: rawAmount,
      paymentMethod,
      paymentDate,
      referenceNumber,
      notes,
      paymentComponents,
      billIds,
    } = body;

    const amount = parseFloat(rawAmount);
    if (!tenantId || !amount || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      include: {
        units: true,
        lease_agreements: {
          where: { status: "ACTIVE" },
          orderBy: { startDate: "desc" },
          take: 1,
        },
      },
    });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const leaseId = tenant.lease_agreements?.[0]?.id ?? null;
    const finalRef =
      referenceNumber?.trim() ||
      `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const payment = await prisma.payments.create({
      data: {
        id: crypto.randomUUID(),
        referenceNumber: finalRef,
        tenantId,
        unitId: tenant.unitId,
        leaseId,
        amount,
        paymentType: "RENT",
        paymentMethod,
        status: "COMPLETED",
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes: notes ?? null,
        createdById: userId,
        verificationStatus: "APPROVED",
        verifiedById: userId,
        verifiedAt: new Date(),
        verificationNotes: "Manual payment recorded by admin",
        updatedAt: new Date(),
        paymentComponents: paymentComponents ?? [],
      },
    });

    if (Array.isArray(billIds) && billIds.length > 0) {
      await prisma.monthly_bills.updateMany({
        where: {
          id: { in: billIds },
          tenantId,
        },
        data: {
          status: "PAID",
          paidDate: new Date(),
          paymentId: payment.id,
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Marked ${billIds.length} bill(s) as PAID for tenant ${tenantId}`);
    }

    console.log("✅ Payment created:", payment.id);
    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        referenceNumber: payment.referenceNumber,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        paymentDate: payment.paymentDate,
      },
    });
  } catch (error: any) {
    console.error("❌ Error recording manual payment:", error.message);
    return NextResponse.json(
      { error: "Failed to record payment", detail: error.message },
      { status: 500 }
    );
  }
}
