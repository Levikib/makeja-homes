import { cookies, headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { getTenantPrisma } from '@/lib/db/prisma-tenant'
import { masterPrisma } from '@/lib/db/prisma-master'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-characters-long'
)

export interface TenantContext {
  prisma: ReturnType<typeof getTenantPrisma>
  tenantSlug: string
  schemaName: string
  organizationId: string
  user: { id: string; email: string; role: string; firstName: string; lastName: string } | null
}

export async function getTenantContext(req?: NextRequest): Promise<TenantContext | null> {
  let tenantSlug: string | null = null
  if (req) {
    tenantSlug = req.headers.get('x-tenant-slug')
  } else {
    tenantSlug = headers().get('x-tenant-slug')
  }
  if (!tenantSlug) return null

  const org = await (masterPrisma as any).organizations.findUnique({ where: { slug: tenantSlug } })
  if (!org || !org.isActive || org.isSuspended || org.schemaStatus !== 'ACTIVE') return null

  const prisma = getTenantPrisma(tenantSlug)
  let user = null

  try {
    let token: string | undefined
    if (req) {
      token = req.cookies.get('token')?.value || req.headers.get('authorization')?.replace('Bearer ', '') || undefined
    } else {
      token = cookies().get('token')?.value
    }
    if (token) {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      const dbUser = await prisma.users.findUnique({
        where: { id: payload.id as string },
        select: { id: true, email: true, role: true, firstName: true, lastName: true, isActive: true }
      })
      if (dbUser?.isActive) user = dbUser
    }
  } catch {}

  return { prisma, tenantSlug, schemaName: `tenant_${tenantSlug}`, organizationId: org.id, user }
}

export async function requireTenantAuth(req: NextRequest) {
  const ctx = await getTenantContext(req)
  if (!ctx || !ctx.user) throw new Error('UNAUTHORIZED')
  return ctx as TenantContext & { user: NonNullable<TenantContext['user']> }
}
