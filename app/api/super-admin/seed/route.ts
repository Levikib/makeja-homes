/**
 * One-time seed endpoint — creates the owner account from env vars.
 * Protected by CRON_SECRET so it can't be called publicly.
 * Usage: GET /api/super-admin/seed?secret=<CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMasterPrisma } from '@/lib/get-prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const SELF_HEAL_TABLE = `
  CREATE TABLE IF NOT EXISTS public.super_admin_users (
    id           TEXT PRIMARY KEY,
    email        TEXT UNIQUE NOT NULL,
    password     TEXT NOT NULL,
    "firstName"  TEXT NOT NULL DEFAULT '',
    "lastName"   TEXT NOT NULL DEFAULT '',
    role         TEXT NOT NULL DEFAULT 'VIEWER',
    "isActive"   BOOLEAN NOT NULL DEFAULT true,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "lastLoginAt" TIMESTAMPTZ,
    "inviteToken" TEXT,
    "inviteExpires" TIMESTAMPTZ,
    "mustSetPassword" BOOLEAN NOT NULL DEFAULT false
  )
`

const SELF_HEAL_INDEX = `
  CREATE INDEX IF NOT EXISTS super_admin_users_email_idx ON public.super_admin_users (email)
`

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = process.env.SUPER_ADMIN_EMAIL
  const password = process.env.SUPER_ADMIN_PASSWORD
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME ?? 'Platform'
  const lastName = process.env.SUPER_ADMIN_LAST_NAME ?? 'Admin'

  if (!email || !password) {
    return NextResponse.json({
      error: 'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD env vars are not set',
    }, { status: 500 })
  }

  const db = getMasterPrisma()
  try {
    await db.$executeRawUnsafe(SELF_HEAL_TABLE)
    await db.$executeRawUnsafe(SELF_HEAL_INDEX)

    const existing = await db.$queryRawUnsafe<any[]>(
      `SELECT id, email, role FROM public.super_admin_users WHERE email = $1 LIMIT 1`,
      email.toLowerCase().trim()
    )

    const hashed = await bcrypt.hash(password, 12)

    if (existing.length > 0) {
      // Reset password to current env var value
      await db.$executeRawUnsafe(
        `UPDATE public.super_admin_users SET password = $1, "mustSetPassword" = false, "updatedAt" = NOW() WHERE email = $2`,
        hashed, email.toLowerCase().trim()
      )
      return NextResponse.json({
        status: 'password_reset',
        message: `Password updated for ${email}. You can now log in at /super-admin/login.`,
      })
    }

    const id = crypto.randomUUID()
    await db.$executeRawUnsafe(
      `INSERT INTO public.super_admin_users (id, email, password, "firstName", "lastName", role)
       VALUES ($1, $2, $3, $4, $5, 'OWNER')`,
      id, email.toLowerCase().trim(), hashed, firstName, lastName
    )

    return NextResponse.json({
      status: 'seeded',
      message: `Owner account created for ${email}. You can now log in at /super-admin/login.`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 })
  } finally {
    await db.$disconnect()
  }
}
