import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
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
    const {
      id,
      previousReading,
      currentReading,
      ratePerUnit,
      unitsConsumed,
      amountDue,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Reading ID required" },
        { status: 400 }
      );
    }

    const reading = await prisma.water_readings.update({
      where: { id },
      data: {
        previousReading,
        currentReading,
        ratePerUnit,
        unitsConsumed,
        amountDue,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Reading updated successfully",
      reading,
    });
  } catch (error: any) {
    console.error("Error updating water reading:", error);
    return NextResponse.json(
      { error: "Failed to update reading" },
      { status: 500 }
    );
  }
}
