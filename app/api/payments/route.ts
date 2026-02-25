import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const payment = await prisma.payments.create({
      data: {
        id: crypto.randomUUID(),
        tenantId: data.tenantId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId,
        referenceNumber: data.referenceNumber,
        paymentDate: data.paymentDate,
        status: data.status || "COMPLETED",
        notes: data.notes,
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
