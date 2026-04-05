import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export const dynamic = 'force-dynamic'

function getTenantPrisma(schema: string) {
  const base = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '')
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
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim()
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

    // Always return success for security (don't reveal if email exists)
    if (!foundUser) {
      return NextResponse.json({ success: true, message: "If an account exists with this email, you will receive password reset instructions." })
    }

    const tenantSlug = foundSchema.replace(/^tenant_/, '')
    const resetToken = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 3600000)

    await foundPrisma!.password_reset_tokens.create({
      data: {
        id: crypto.randomUUID(),
        userId: foundUser.id,
        token: resetToken,
        expiresAt,
        used: false,
      },
    })
    await foundPrisma!.$disconnect()

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}&tenant=${tenantSlug}`

    try {
      await sendPasswordResetEmail(foundUser.email, resetLink, `${foundUser.firstName} ${foundUser.lastName}`)
    } catch (emailError: any) {
      console.error("Password reset email failed:", emailError.message)
    }

    return NextResponse.json({ success: true, message: "If an account exists with this email, you will receive password reset instructions." })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ error: "An error occurred. Please try again." }, { status: 500 })
  }
}
