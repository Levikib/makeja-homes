/**
 * Super-admin user management — stored in the public (master) schema.
 * Table is self-healed on first access; no Prisma model needed.
 */

import { getMasterPrisma } from '@/lib/get-prisma'

export type SuperAdminRole = 'OWNER' | 'VIEWER'

export interface SuperAdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: SuperAdminRole
  isActive: boolean
  createdAt: Date
  lastLoginAt: Date | null
}

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

async function heal() {
  const db = getMasterPrisma()
  try {
    await db.$executeRawUnsafe(SELF_HEAL_TABLE)
    await db.$executeRawUnsafe(SELF_HEAL_INDEX)
  } finally {
    await db.$disconnect()
  }
}

export async function getSuperAdminByEmail(email: string): Promise<(SuperAdminUser & { password: string; mustSetPassword: boolean }) | null> {
  await heal()
  const db = getMasterPrisma()
  try {
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM public.super_admin_users WHERE email = $1 AND "isActive" = true LIMIT 1`,
      email.toLowerCase().trim()
    )
    return rows[0] ?? null
  } finally {
    await db.$disconnect()
  }
}

export async function getSuperAdminById(id: string): Promise<SuperAdminUser | null> {
  await heal()
  const db = getMasterPrisma()
  try {
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT id, email, "firstName", "lastName", role, "isActive", "createdAt", "lastLoginAt"
       FROM public.super_admin_users WHERE id = $1 LIMIT 1`,
      id
    )
    return rows[0] ?? null
  } finally {
    await db.$disconnect()
  }
}

export async function getAllSuperAdmins(): Promise<SuperAdminUser[]> {
  await heal()
  const db = getMasterPrisma()
  try {
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT id, email, "firstName", "lastName", role, "isActive", "createdAt", "lastLoginAt"
       FROM public.super_admin_users ORDER BY "createdAt" ASC`
    )
    return rows
  } finally {
    await db.$disconnect()
  }
}

export async function createSuperAdmin(data: {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  role: SuperAdminRole
  mustSetPassword?: boolean
}): Promise<void> {
  await heal()
  const db = getMasterPrisma()
  try {
    await db.$executeRawUnsafe(
      `INSERT INTO public.super_admin_users (id, email, password, "firstName", "lastName", role, "mustSetPassword")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      data.id, data.email.toLowerCase().trim(), data.password,
      data.firstName, data.lastName, data.role, data.mustSetPassword ?? false
    )
  } finally {
    await db.$disconnect()
  }
}

export async function updateSuperAdminPassword(id: string, hashedPassword: string): Promise<void> {
  const db = getMasterPrisma()
  try {
    await db.$executeRawUnsafe(
      `UPDATE public.super_admin_users SET password = $1, "mustSetPassword" = false, "updatedAt" = NOW() WHERE id = $2`,
      hashedPassword, id
    )
  } finally {
    await db.$disconnect()
  }
}

export async function updateLastLogin(id: string): Promise<void> {
  const db = getMasterPrisma()
  try {
    await db.$executeRawUnsafe(
      `UPDATE public.super_admin_users SET "lastLoginAt" = NOW() WHERE id = $1`,
      id
    )
  } finally {
    await db.$disconnect()
  }
}

export async function setInviteToken(id: string, token: string, expiresAt: Date): Promise<void> {
  const db = getMasterPrisma()
  try {
    await db.$executeRawUnsafe(
      `UPDATE public.super_admin_users SET "inviteToken" = $1, "inviteExpires" = $2, "updatedAt" = NOW() WHERE id = $3`,
      token, expiresAt, id
    )
  } finally {
    await db.$disconnect()
  }
}

export async function getByInviteToken(token: string): Promise<(SuperAdminUser & { inviteToken: string; inviteExpires: Date; mustSetPassword: boolean }) | null> {
  await heal()
  const db = getMasterPrisma()
  try {
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM public.super_admin_users WHERE "inviteToken" = $1 AND "inviteExpires" > NOW() LIMIT 1`,
      token
    )
    return rows[0] ?? null
  } finally {
    await db.$disconnect()
  }
}

export async function clearInviteToken(id: string): Promise<void> {
  const db = getMasterPrisma()
  try {
    await db.$executeRawUnsafe(
      `UPDATE public.super_admin_users SET "inviteToken" = NULL, "inviteExpires" = NULL, "mustSetPassword" = false, "updatedAt" = NOW() WHERE id = $1`,
      id
    )
  } finally {
    await db.$disconnect()
  }
}

export async function updateSuperAdmin(id: string, data: { firstName?: string; lastName?: string; role?: SuperAdminRole; isActive?: boolean }): Promise<void> {
  const db = getMasterPrisma()
  const sets: string[] = []
  const vals: any[] = []
  let idx = 1
  if (data.firstName !== undefined) { sets.push(`"firstName" = $${idx++}`); vals.push(data.firstName) }
  if (data.lastName !== undefined) { sets.push(`"lastName" = $${idx++}`); vals.push(data.lastName) }
  if (data.role !== undefined) { sets.push(`role = $${idx++}`); vals.push(data.role) }
  if (data.isActive !== undefined) { sets.push(`"isActive" = $${idx++}`); vals.push(data.isActive) }
  if (!sets.length) return
  sets.push(`"updatedAt" = NOW()`)
  vals.push(id)
  try {
    await db.$executeRawUnsafe(
      `UPDATE public.super_admin_users SET ${sets.join(', ')} WHERE id = $${idx}`,
      ...vals
    )
  } finally {
    await db.$disconnect()
  }
}

/**
 * Seed the owner account from env vars on first boot.
 * Called lazily — only runs if no super_admin_users exist.
 */
export async function seedOwnerIfEmpty(): Promise<void> {
  await heal()
  const db = getMasterPrisma()
  try {
    const count = await db.$queryRawUnsafe<{ count: string }[]>(
      `SELECT COUNT(*) as count FROM public.super_admin_users`
    )
    if (parseInt(count[0]?.count ?? '0') > 0) return

    const email = process.env.SUPER_ADMIN_EMAIL?.trim()
    const password = process.env.SUPER_ADMIN_PASSWORD?.trim()
    const firstName = (process.env.SUPER_ADMIN_FIRST_NAME ?? 'Platform').trim()
    const lastName = (process.env.SUPER_ADMIN_LAST_NAME ?? 'Admin').trim()

    if (!email || !password) return

    const bcrypt = await import('bcryptjs')
    const hashed = await bcrypt.hash(password, 12)
    const crypto = await import('crypto')
    const id = crypto.randomUUID()

    await db.$executeRawUnsafe(
      `INSERT INTO public.super_admin_users (id, email, password, "firstName", "lastName", role)
       VALUES ($1, $2, $3, $4, $5, 'OWNER')
       ON CONFLICT (email) DO NOTHING`,
      id, email.toLowerCase().trim(), hashed, firstName, lastName
    )
    console.log('[super-admin] Owner account seeded:', email)
  } catch (err: any) {
    console.error('[super-admin] Seed error:', err?.message)
  } finally {
    await db.$disconnect()
  }
}
