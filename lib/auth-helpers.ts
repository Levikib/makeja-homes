import { cookies, headers } from "next/headers"
import { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { PrismaClient } from "@prisma/client"
import { getPrismaForRequest } from "@/lib/get-prisma"

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
    if (!token) return null

    const { payload } = await jwtVerify(token, JWT_SECRET)

    // Prefer tenantSlug from JWT (set at login); fall back to subdomain
    let schemaName: string
    if (payload.tenantSlug) {
      schemaName = `tenant_${payload.tenantSlug}`
    } else {
      const h = await headers()
      const host = h.get('x-forwarded-host') || h.get('host') || ''
      schemaName = getSchemaFromHost(host)
    }

    const prisma = buildPrismaForSchema(schemaName)
    
    try {
      const user = await prisma.users.findUnique({
        where: { id: payload.id as string },
        select: { id: true, email: true, role: true, firstName: true, lastName: true, companyId: true, isActive: true }
      })
      if (!user?.isActive) return null
      return user
    } finally {
      await prisma.$disconnect()
    }
  } catch {
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
    const prisma = getPrismaForRequest(req)

    const user = await prisma.users.findUnique({
      where: { id: payload.id as string },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, companyId: true, isActive: true }
    })

    if (!user?.isActive) return null
    return user
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
