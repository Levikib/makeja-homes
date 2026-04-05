import { NextRequest, NextResponse } from "next/server";
import { getPrismaForTenant } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    console.log("🔍 Validating reset token");

    if (!token) {
      return NextResponse.json({ valid: false, error: "Token is required" }, { status: 400 });
    }

    // Find token
    const resetToken = await getPrismaForTenant(request).password_reset_tokens.findUnique({
      where: { token },
      include: { users: true },
    });

    if (!resetToken) {
      console.log("❌ Token not found");
      return NextResponse.json({ valid: false, error: "Invalid reset token" });
    }

    if (resetToken.used) {
      console.log("❌ Token already used");
      return NextResponse.json({ valid: false, error: "This reset link has already been used" });
    }

    if (new Date() > resetToken.expiresAt) {
      console.log("❌ Token expired");
      return NextResponse.json({ valid: false, error: "This reset link has expired" });
    }

    console.log("✅ Token is valid");
    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("❌ Token validation error:", error);
    return NextResponse.json({ valid: false, error: "Validation failed" }, { status: 500 });
  }
}