// ═══════════════════════════════════════════════════════════
// lib/auth-tenant.ts
//
// UPDATED auth helper that reads tenant context from headers.
// Replaces the direct `prisma` import in getCurrentUser.
//
// In each API route or server component, instead of:
//   import { prisma } from '@/lib/prisma'
//
// Use:
//   import { getTenantContext } from '@/lib/auth-tenant'
//   const { prisma, user } = await getTenantContext(request)
// ═══════════════════════════════════════════════════════════

import { cookies, headers } from 'next/headers'
import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { getTenantPrisma } from '@/lib/db/prisma-tenant'
import { masterPrisma } from '@/lib/db/prisma-master'

export interface TenantContext {
  prisma: ReturnType<typeof getTenantPrisma>
  tenantSlug: string
  schemaName: string
  organizationId: string
  user: {
    id: string
    email: string
    role: string
    firstName: string
    lastName: string
  } | null
}

/**
 * Get the full tenant context for the current request.
 * Reads tenant slug from request headers (set by middleware).
 * Returns prisma client scoped to that tenant's schema.
 *
 * @param req - The NextRequest object (for API routes)
 *              or null (for server components, uses headers())
 */
export async function getTenantContext(req?: NextRequest): Promise<TenantContext | null> {
  // ── Get tenant slug from headers (set by middleware) ───────
  let tenantSlug: string | null = null

  if (req) {
    tenantSlug = req.headers.get('x-tenant-slug')
  } else {
    const h = headers()
    tenantSlug = h.get('x-tenant-slug')
  }

  if (!tenantSlug) {
    // No tenant slug = marketing site or super admin
    return null
  }

  // ── Verify organization exists and is active ───────────────
  const org = await (masterPrisma as any).organizations.findUnique({
    where: { slug: tenantSlug },
  })

  if (!org || !org.isActive || org.isSuspended) {
    return null
  }

  if (org.schemaStatus !== 'ACTIVE') {
    return null
  }

  // ── Get tenant-scoped prisma client ────────────────────────
  const prisma = getTenantPrisma(tenantSlug)

  // ── Get current user from JWT ──────────────────────────────
  let user = null
  try {
    let token: string | undefined

    if (req) {
      token = req.cookies.get('auth-token')?.value ||
              req.headers.get('authorization')?.replace('Bearer ', '')
    } else {
      const c = cookies()
      token = c.get('auth-token')?.value
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      // Fetch user from TENANT schema (not master)
      const dbUser = await prisma.users.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      })
      if (dbUser?.isActive) {
        user = dbUser
      }
    }
  } catch {
    // Invalid or expired token — user stays null
  }

  return {
    prisma,
    tenantSlug,
    schemaName: `tenant_${tenantSlug}`,
    organizationId: org.id,
    user,
  }
}

/**
 * Require authentication. Returns context or throws 401.
 * Use in protected API routes.
 */
export async function requireTenantAuth(req: NextRequest): Promise<TenantContext & { user: NonNullable<TenantContext['user']> }> {
  const ctx = await getTenantContext(req)
  if (!ctx || !ctx.user) {
    throw new Error('UNAUTHORIZED')
  }
  return ctx as TenantContext & { user: NonNullable<TenantContext['user']> }
}

/**
 * Require admin or manager role.
 */
export async function requireAdmin(req: NextRequest): Promise<TenantContext & { user: NonNullable<TenantContext['user']> }> {
  const ctx = await requireTenantAuth(req)
  if (!['ADMIN', 'MANAGER'].includes(ctx.user.role)) {
    throw new Error('FORBIDDEN')
  }
  return ctx
}
