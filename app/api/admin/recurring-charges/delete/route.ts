import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Charge ID required" },
        { status: 400 }
      );
    }

    // Delete recurring charge
    await prisma.recurringCharges.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Recurring charge deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting recurring charge:", error);
    return NextResponse.json(
      { error: "Failed to delete recurring charge" },
      { status: 500 }
    );
  }
}
