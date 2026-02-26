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

    const data = await request.json();

    // Get tenant to find unitId
    const tenant = await prisma.tenants.findUnique({
      where: { id: data.tenantId },
    });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const payment = await prisma.payments.create({
      data: {
        id: crypto.randomUUID(),
        tenantId: data.tenantId,
        unitId: tenant.unitId,
        amount: data.amount,
        paymentType: data.paymentType || "RENT",
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId,
        referenceNumber: data.referenceNumber || `PAY-${Date.now()}`,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        status: data.status || "COMPLETED",
        notes: data.notes,
        createdById: userId,
      },
    });
    return NextResponse.json(payment);
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
