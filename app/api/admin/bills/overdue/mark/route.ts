import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { markOverdueBills } from "@/lib/jobs/mark-overdue-bills";

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

    const count = await markOverdueBills();

    return NextResponse.json({
      success: true,
      message: `Marked ${count} bills as overdue`,
      count
    });
  } catch (error: any) {
    console.error("❌ Error marking overdue bills:", error);
    return NextResponse.json(
      { error: "Failed to mark overdue bills" },
      { status: 500 }
    );
  }
}
