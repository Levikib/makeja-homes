import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    console.log("🔍 Reset password request received");

    if (!token || !newPassword) {
      console.log("❌ Missing token or password");
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    console.log("🔑 Validating token...");

    // Find and validate token
    const resetToken = await prisma.password_reset_tokens.findUnique({
      where: { token },
      include: { users: true },
    });

    if (!resetToken) {
      console.log("❌ Token not found");
      return NextResponse.json({ error: "Invalid reset token" }, { status: 400 });
    }

    if (resetToken.used) {
      console.log("❌ Token already used");
      return NextResponse.json({ error: "This reset link has already been used" }, { status: 400 });
    }

    if (new Date() > resetToken.expiresAt) {
      console.log("❌ Token expired");
      return NextResponse.json({ error: "This reset link has expired" }, { status: 400 });
    }

    console.log("✅ Token is valid");
    console.log("🔐 Hashing new password...");

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log("💾 Updating user password...");

    // Update user password
    await prisma.users.update({
      where: { id: resetToken.userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    console.log("✅ Password updated");
    console.log("🔒 Marking token as used...");

    // Mark token as used
    await prisma.password_reset_tokens.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    console.log("✅ Password reset completed successfully!");

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}