import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { supplier, propertyId, orderDate, expectedDelivery, notes, totalAmount, lineItems } = body;

    if (!supplier || !propertyId || !orderDate || !lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate order number
    const orderCount = await prisma.purchase_orders.count();
    const orderNumber = `PO-${String(orderCount + 1).padStart(5, '0')}`;

    // Create purchase order
    const order = await prisma.purchase_orders.create({
      data: {
        orderNumber,
        supplier,
        propertyId,
        status: "PENDING",
        orderDate: new Date(orderDate),
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        notes,
        totalAmount: parseFloat(totalAmount),
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
