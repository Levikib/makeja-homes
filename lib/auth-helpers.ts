import { cookies, headers } from "next/headers"
import { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { PrismaClient } from "@prisma/client"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

function getSchemaFromHost(host: string): string {
  const parts = host.split('.')
  if (parts.length >= 4) {
    const sub = parts[0].toLowerCase()
    if (!['www','app','api'].includes(sub) && /^[a-z0-9-]+$/.test(sub)) {
      return `tenant_${sub}`
    }
  }
  return 'public'
}

function buildPrismaForSchema(schemaName: string): PrismaClient {
  const base = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '')
    .replace('-pooler.', '.')
    .replace(/[?&]schema=[^&]*/g, '')
    .replace(/[?&]options=[^&]*/g, '')
  const sep = base.includes('?') ? '&' : '?'
  return new PrismaClient({
    datasources: { db: { url: `${base}${sep}options=--search_path%3D${schemaName}` } }
  })
}

// For server components (layout, pages) — reads host from headers()
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value
    if (!token) { console.log('[AUTH] no token cookie'); return null }

    const { payload } = await jwtVerify(token, JWT_SECRET)
    console.log('[AUTH] JWT payload tenantSlug:', payload.tenantSlug, 'id:', payload.id)

    // Prefer tenantSlug from JWT (set at login); fall back to subdomain
    let schemaName: string
    if (payload.tenantSlug) {
      schemaName = `tenant_${payload.tenantSlug}`
    } else {
      const h = await headers()
      const host = h.get('x-forwarded-host') || h.get('host') || ''
      schemaName = getSchemaFromHost(host)
    }
    console.log('[AUTH] using schema:', schemaName)

    const prisma = buildPrismaForSchema(schemaName)

    try {
      // Debug: check which schema is actually active and if user exists by raw query
      const schemaCheck = await prisma.$queryRaw<{current_schema: string}[]>`SELECT current_schema()`
      console.log('[AUTH] actual DB schema:', schemaCheck[0]?.current_schema)
      const rawCheck = await prisma.$queryRaw<{id: string}[]>`SELECT id FROM users WHERE id = ${payload.id as string} LIMIT 1`
      console.log('[AUTH] raw user lookup result count:', rawCheck.length)

      const rows = await prisma.$queryRaw<any[]>`
        SELECT id, email, role, "firstName", "lastName", "companyId", "isActive"
        FROM users WHERE id = ${payload.id as string} LIMIT 1
      `
      const user = rows[0] ?? null
      console.log('[AUTH] user found:', !!user, 'isActive:', user?.isActive)
      if (!user) return null
      if (user.isActive === false) return null
      return user
    } finally {
      await prisma.$disconnect()
    }
  } catch (e: any) {
    console.error('[AUTH] getCurrentUser error:', e?.message)
    return null
  }
}

// For API routes — reads from request object
export async function getCurrentUserFromRequest(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value ||
                  req.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return null

    const { payload } = await jwtVerify(token, JWT_SECRET)

    // Use tenantSlug from JWT; fall back to x-tenant-slug header set by middleware
    const tenantSlug = (payload.tenantSlug as string) || req.headers.get('x-tenant-slug') || ''
    const schemaName = tenantSlug ? `tenant_${tenantSlug}` : 'public'
    const prisma = buildPrismaForSchema(schemaName)

    try {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT id, email, role, "firstName", "lastName", "companyId", "isActive"
        FROM users WHERE id = ${payload.id as string} LIMIT 1
      `
      const user = rows[0] ?? null
      if (!user) return null
      if (user.isActive === false) return null
      return user
    } finally {
      await prisma.$disconnect()
    }
  } catch {
    return null
  }
}

export async function requireRole(roles: string[]) {
  const user = await getCurrentUser()
  if (!user) {
    const { redirect } = await import("next/navigation")
    redirect("/auth/login")
  }
  if (!roles.includes(user!.role)) {
    const { redirect } = await import("next/navigation")
    redirect("/dashboard/admin")
  }
  return user
}
