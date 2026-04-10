import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import crypto from "crypto";
import { isRevoked, revokeToken } from "@/lib/token-blocklist";

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const TWO_HOURS = 2 * 60 * 60 // seconds

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Check revocation list
    const jti = payload.jti as string | undefined
    if (jti && await isRevoked(jti)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = NextResponse.json({
      id: payload.id,
      userId: payload.id,
      email: payload.email,
      role: payload.role,
      firstName: payload.firstName,
      lastName: payload.lastName,
      companyId: payload.companyId,
      tenantSlug: payload.tenantSlug,
    });

    // Token rotation: re-issue if expiring within 2 hours
    const exp = payload.exp as number | undefined
    if (exp) {
      const nowSec = Math.floor(Date.now() / 1000)
      const remaining = exp - nowSec
      if (remaining > 0 && remaining < TWO_HOURS) {
        // Revoke the old token before issuing a new one
        if (jti) await revokeToken(jti)

        const newToken = await new SignJWT({
          id: payload.id,
          email: payload.email,
          role: payload.role,
          firstName: payload.firstName,
          lastName: payload.lastName,
          companyId: payload.companyId,
          tenantSlug: payload.tenantSlug,
          mustChangePassword: payload.mustChangePassword ?? false,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setJti(crypto.randomUUID())
          .setIssuedAt()
          .setExpirationTime("24h")
          .sign(JWT_SECRET)

        res.cookies.set("token", newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24,
          path: "/",
        })
      }
    }

    return res;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
