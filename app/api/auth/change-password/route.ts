import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { getPrismaForRequest } from "@/lib/get-prisma";

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: "New password must be different from current password" }, { status: 400 });
    }
    if (typeof newPassword !== 'string' || newPassword.length > 128) {
      return NextResponse.json({ error: "Password too long" }, { status: 400 });
    }

    const db = getPrismaForRequest(request);

    // Get current password hash
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT id, password FROM users WHERE id = $1 LIMIT 1`, userId
    );
    if (!rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear mustChangePassword
    await db.$executeRawUnsafe(
      `UPDATE users SET password = $2, "mustChangePassword" = false, "updatedAt" = NOW() WHERE id = $1`,
      userId, hashedPassword
    );

    // Issue new JWT with mustChangePassword = false
    const newToken = await new SignJWT({
      id: payload.id,
      email: payload.email,
      role: payload.role,
      firstName: payload.firstName,
      lastName: payload.lastName,
      companyId: payload.companyId,
      tenantSlug: payload.tenantSlug,
      mustChangePassword: false,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    const res = NextResponse.json({ success: true, message: "Password updated successfully" });
    res.cookies.set("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });

    return res;
  } catch (error: any) {
    console.error("Change password error:", error?.message);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
