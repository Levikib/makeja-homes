import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { limiters } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic'

function getTenantPrisma(schema: string) {
  const base = (process.env.DIRECT_DATABASE_URL || process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || '')
    .replace('-pooler.', '.')
    .replace(/[?&]schema=[^&]*/g, '')
    .replace(/[?&]options=[^&]*/g, '')
  const sep = base.includes('?') ? '&' : '?'
  return new PrismaClient({ datasources: { db: { url: `${base}${sep}options=--search_path%3D${schema}` } } })
}

async function getAllTenantSchemas(): Promise<string[]> {
  const master = new PrismaClient({ datasources: { db: { url: process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || '' } } })
  try {
    const rows = await master.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name
    `
    return rows.map(r => r.schema_name)
  } finally {
    await master.$disconnect()
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 attempts per 15 minutes per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rl = await limiters.auth(ip)
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const { token, newPassword, tenant } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    if (typeof token !== 'string' || typeof newPassword !== 'string') {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Password complexity: require at least one letter and one number
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json({ error: "Password must contain at least one letter and one number" }, { status: 400 });
    }

    // Build schema search list — tenant hint first for performance, then rest
    const allSchemas = await getAllTenantSchemas()
    const schemasToSearch: string[] = []
    if (tenant && typeof tenant === 'string' && /^[a-z0-9-]+$/.test(tenant)) {
      schemasToSearch.push(`tenant_${tenant}`)
    }
    for (const s of allSchemas) {
      if (!schemasToSearch.includes(s)) schemasToSearch.push(s)
    }

    let resetToken: any = null
    let foundPrisma: PrismaClient | null = null

    // Tokens are now stored as bcrypt hashes. We fetch recent unexpired, unused tokens
    // and compare each hash against the raw token. We limit to 20 per schema to
    // avoid timing attacks across thousands of tokens.
    for (const schema of schemasToSearch) {
      const prisma = getTenantPrisma(schema)
      try {
        // Fetch candidates: unexpired, unused tokens in this schema
        const candidates = await prisma.password_reset_tokens.findMany({
          where: { used: false, expiresAt: { gt: new Date() } },
          include: { users: true },
          orderBy: { expiresAt: 'desc' },
          take: 20,
        })
        for (const candidate of candidates) {
          const matches = await bcrypt.compare(token, candidate.token)
          if (matches) {
            resetToken = candidate
            foundPrisma = prisma
            break
          }
        }
        if (resetToken) break
      } catch { /* skip */ } finally {
        if (!resetToken) await prisma.$disconnect()
      }
    }

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }
    if (resetToken.used) {
      await foundPrisma!.$disconnect()
      return NextResponse.json({ error: "This reset link has already been used" }, { status: 400 });
    }
    if (new Date() > resetToken.expiresAt) {
      await foundPrisma!.$disconnect()
      return NextResponse.json({ error: "This reset link has expired" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12); // work factor 12

    await foundPrisma!.users.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword, updatedAt: new Date() },
    });

    await foundPrisma!.password_reset_tokens.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    await foundPrisma!.$disconnect()

    return NextResponse.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
