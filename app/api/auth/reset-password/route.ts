import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
    const { token, newPassword, tenant } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Search for the token — use tenant hint if provided, else search all schemas
    const schemasToSearch: string[] = []
    if (tenant) schemasToSearch.push(`tenant_${tenant}`)
    const allSchemas = await getAllTenantSchemas()
    for (const s of allSchemas) {
      if (!schemasToSearch.includes(s)) schemasToSearch.push(s)
    }

    let resetToken: any = null
    let foundPrisma: PrismaClient | null = null

    for (const schema of schemasToSearch) {
      const prisma = getTenantPrisma(schema)
      try {
        const t = await prisma.password_reset_tokens.findUnique({
          where: { token },
          include: { users: true },
        })
        if (t) {
          resetToken = t
          foundPrisma = prisma
          break
        }
      } catch { /* skip */ } finally {
        if (!resetToken) await prisma.$disconnect()
      }
    }

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid reset token" }, { status: 400 });
    }
    if (resetToken.used) {
      await foundPrisma!.$disconnect()
      return NextResponse.json({ error: "This reset link has already been used" }, { status: 400 });
    }
    if (new Date() > resetToken.expiresAt) {
      await foundPrisma!.$disconnect()
      return NextResponse.json({ error: "This reset link has expired" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

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
