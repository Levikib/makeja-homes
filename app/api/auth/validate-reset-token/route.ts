import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ valid: false, error: "Token is required" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT prt.id, prt.used, prt."expiresAt",
        u.id AS "userId", u.email
      FROM password_reset_tokens prt
      JOIN users u ON u.id = prt."userId"
      WHERE prt.token = $1 LIMIT 1
    `, token);

    if (rows.length === 0) {
      return NextResponse.json({ valid: false, error: "Invalid reset token" });
    }
    const resetToken = rows[0];

    if (resetToken.used) {
      return NextResponse.json({ valid: false, error: "This reset link has already been used" });
    }

    if (new Date() > new Date(resetToken.expiresAt)) {
      return NextResponse.json({ valid: false, error: "This reset link has expired" });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("❌ Token validation error:", error);
    return NextResponse.json({ valid: false, error: "Validation failed" }, { status: 500 });
  }
}
