import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { tenantId, amount, month } = body;

    if (!tenantId || !amount || !month) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get tenant's unitId
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { unitId: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const now = new Date();

    // Check if fee already exists for this tenant and month
    const existingFee = await prisma.garbage_fees.findFirst({
      where: {
        tenantId,
        month: new Date(month),
      },
    });

    if (existingFee) {
      // Update existing fee
      const garbageFee = await prisma.garbage_fees.update({
        where: { id: existingFee.id },
        data: {
          amount,
          updatedAt: now,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Garbage fee updated successfully",
        garbageFee,
      });
    } else {
      // Create new fee
      const garbageFee = await prisma.garbage_fees.create({
        data: {
          id: `garbage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId,
          unitId: tenant.unitId,
          amount,
          month: new Date(month),
          updatedAt: now,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Garbage fee created successfully",
        garbageFee,
      });
    }
  } catch (error: any) {
    console.error("❌ Error saving garbage fee:", error);
    return NextResponse.json(
      { error: "Failed to save garbage fee", details: error.message },
      { status: 500 }
    );
  }
}
