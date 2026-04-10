import { NextRequest, NextResponse } from "next/server";
import { getPrismaForRequest } from "@/lib/get-prisma";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { limiters } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit: same as auth (10 per 15 min per IP)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rl = limiters.auth(ip)
  if (!rl.success) {
    return NextResponse.json({ valid: false, error: "Too many attempts" }, { status: 429 })
  }

  try {
    const body = await request.json();
    const { token, tenant } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ valid: false, error: "Token is required" }, { status: 400 });
    }

    // Build candidate list from tenant hint or fall back to request schema
    async function getCandidates(prisma: PrismaClient) {
      return prisma.password_reset_tokens.findMany({
        where: { used: false, expiresAt: { gt: new Date() } },
        include: { users: { select: { id: true, email: true } } },
        orderBy: { expiresAt: 'desc' },
        take: 20,
      })
    }

    const db = getPrismaForRequest(request);
    const candidates = await getCandidates(db)

    for (const candidate of candidates) {
      const matches = await bcrypt.compare(token, candidate.token)
      if (matches) {
        if (candidate.used) {
          return NextResponse.json({ valid: false, error: "This reset link has already been used" });
        }
        if (new Date() > new Date(candidate.expiresAt)) {
          return NextResponse.json({ valid: false, error: "This reset link has expired" });
        }
        return NextResponse.json({ valid: true });
      }
    }

    return NextResponse.json({ valid: false, error: "Invalid reset token" });
  } catch (error) {
    console.error("❌ Token validation error:", error);
    return NextResponse.json({ valid: false, error: "Validation failed" }, { status: 500 });
  }
}
