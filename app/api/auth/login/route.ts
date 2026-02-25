import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-min-32-characters-long"
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is inactive. Please contact administrator." },
        { status: 403 }
      );
    }

    if (user.mustChangePassword) {
      const token = await new SignJWT({
         id: user.id,
         email: user.email,
         role: user.role,
         companyId: user.companyId,
         firstName: user.firstName,
         lastName: user.lastName,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("1h")
          .sign(JWT_SECRET);

      const response = NextResponse.json({
         mustChangePassword: true,
         userId: user.id,
         message: "Password change required"
      });
   
     response.cookies.set("token", token, {
       httpOnly: true,
       secure: process.env.NODE_ENV === "production",
       sameSite: "lax",
       maxAge: 3600,
    });
    return response;
      }
    // Update last login
    await prisma.users.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create JWT token - CRITICAL: Use same field names as getCurrentUser expects
    const token = await new SignJWT({
      id: user.id,           // FIXED: was userId, now id
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      firstName: user.firstName,
      lastName: user.lastName,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h") // 24 hours
      .sign(JWT_SECRET);

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });

    // Set cookie with token
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400, // 24 hours in seconds
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
