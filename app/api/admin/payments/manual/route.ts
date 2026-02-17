import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;
    const userId = payload.id as string;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { tenantId, amount, paymentMethod, paymentDate, referenceNumber, notes, billIds = [] } = await request.json();

    if (!tenantId || !amount || !paymentMethod) {
      return NextResponse.json({ error: "Tenant ID, amount, and payment method are required" }, { status: 400 });
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      include: { users: true, units: true }
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const finalReferenceNumber = referenceNumber || `MAN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const payment = await prisma.payments.create({
      data: {
        id: uuidv4(),
        referenceNumber: finalReferenceNumber,
        tenantId: tenantId,
        unitId: tenant.unitId,
        leaseId: tenant.leaseId,
        amount: parseFloat(amount),
        paymentType: "RENT",
        paymentMethod: paymentMethod,
        status: "COMPLETED",
        paymentDate: new Date(paymentDate || Date.now()),
        notes: notes || null,
        createdById: userId,
        verificationStatus: "APPROVED",
        verifiedById: userId,
        verifiedAt: new Date(),
        verificationNotes: "Manual payment recorded by admin",
      }
    });

    let updatedBills = [];
    if (billIds && billIds.length > 0) {
      updatedBills = await Promise.all(
        billIds.map(async (billId: string) => {
          return await prisma.monthly_bills.update({
            where: { id: billId },
            data: { status: "PAID", paidDate: new Date(paymentDate || Date.now()), paymentId: payment.id }
          });
        })
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
      payment: { id: payment.id, referenceNumber: payment.referenceNumber, amount: payment.amount, paymentMethod: payment.paymentMethod, status: payment.status, paymentDate: payment.paymentDate },
      billsUpdated: updatedBills.length,
      billIds: updatedBills.map(b => b.id)
    });

  } catch (error: any) {
    console.error("❌ Error recording manual payment:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
