import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "@/lib/email";
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

const GENERIC_RESPONSE = { success: true, message: "If an account exists with this email, you will receive password reset instructions." }

export async function POST(request: NextRequest) {
  // Rate limit: 5 requests per hour per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rl = limiters.passwordReset(ip)
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many password reset attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = await request.json();
    const { email } = body;
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(GENERIC_RESPONSE) // don't reveal validation
    }

    const schemas = await getAllTenantSchemas()

    let foundUser: any = null
    let foundPrisma: PrismaClient | null = null
    let foundSchema = ''

    for (const schema of schemas) {
      const prisma = getTenantPrisma(schema)
      try {
        const user = await prisma.users.findUnique({ where: { email: normalizedEmail } })
        if (user) {
          foundUser = user
          foundPrisma = prisma
          foundSchema = schema
          break
        }
      } catch { /* skip */ } finally {
        if (!foundUser) await prisma.$disconnect()
      }
    }

    // Always return the same response regardless of whether email exists (prevents enumeration)
    if (!foundUser) {
      return NextResponse.json(GENERIC_RESPONSE)
    }

    const tenantSlug = foundSchema.replace(/^tenant_/, '')

    // Generate a cryptographically random token
    const rawToken = crypto.randomBytes(32).toString("hex") // sent to user
    // Hash before storing — if DB is breached, tokens can't be used directly
    const tokenHash = await bcrypt.hash(rawToken, 10)
    const expiresAt = new Date(Date.now() + 3600000) // 1 hour

    await foundPrisma!.password_reset_tokens.create({
      data: {
        id: crypto.randomUUID(),
        userId: foundUser.id,
        token: tokenHash,  // store the HASH, not the raw token
        expiresAt,
        used: false,
      },
    })
    await foundPrisma!.$disconnect()

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${rawToken}&tenant=${tenantSlug}`

    try {
      await sendPasswordResetEmail(foundUser.email, resetLink, `${foundUser.firstName} ${foundUser.lastName}`)
    } catch (emailError: any) {
      console.error("Password reset email failed:", emailError.message)
    }

    return NextResponse.json(GENERIC_RESPONSE)
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ error: "An error occurred. Please try again." }, { status: 500 })
  }
}
