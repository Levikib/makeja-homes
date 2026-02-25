import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "ADMIN" && payload.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updatedBill = await prisma.monthly_bills.update({
      where: { id: params.id },
      data: { status: "PAID", paidDate: new Date() }
    });

    return NextResponse.json({ success: true, bill: updatedBill });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to mark bill as paid" }, { status: 500 });
  }
}
