import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { revokeToken } from "@/lib/token-blocklist";

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function POST(request: NextRequest) {
  try {
    // Revoke the current token so it can't be replayed even if somehow retained
    const token = request.cookies.get("token")?.value
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        if (payload.jti) await revokeToken(payload.jti as string)
      } catch {
        // Token already invalid — that's fine, we're logging out anyway
      }
    }

    const response = NextResponse.json({ success: true });

    // Expire the token cookie
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    // Also clear CSRF token
    response.cookies.set("csrf_token", "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "An error occurred during logout" }, { status: 500 });
  }
}
