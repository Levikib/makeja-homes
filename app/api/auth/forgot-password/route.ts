import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    console.log("🔍 Looking for user with email:", email);

    // Find user
    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() },
    });

    // For security, always return success even if user doesn't exist
    if (!user) {
      console.log("⚠️ User not found, but returning success for security");
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive password reset instructions.",
      });
    }

    console.log("✅ User found:", user.email);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    console.log("🔑 Generated reset token");

    // Store token in database
    await prisma.password_reset_tokens.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
        used: false,
      },
    });

    console.log("💾 Token saved to database");

    // Create reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;

    console.log("📧 Attempting to send email to:", user.email);

    // Send email
    try {
      await sendPasswordResetEmail(
        user.email,
        resetLink,
        `${user.firstName} ${user.lastName}`
      );
      console.log("✅ Email sent successfully!");
    } catch (emailError: any) {
      console.error("❌ Email sending failed:", emailError.message);
      console.error("Full error:", emailError);
      // Continue even if email fails - token is saved
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive password reset instructions.",
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}