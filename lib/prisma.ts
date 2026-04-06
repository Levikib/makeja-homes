import { PrismaClient } from '@prisma/client'
import { headers } from 'next/headers'
import { buildTenantUrl, getSchemaFromHost } from '@/lib/get-prisma'

const clientCache = new Map<string, PrismaClient>()

export function getClient(schemaName: string): PrismaClient {
  if (clientCache.has(schemaName)) return clientCache.get(schemaName)!
  if (clientCache.size >= 25) {
    const first = clientCache.keys().next().value as string | undefined
    if (first !== undefined) {
      clientCache.get(first)?.$disconnect()
      clientCache.delete(first)
    }
  }
  const client = new PrismaClient({
    datasources: { db: { url: buildTenantUrl(schemaName) } },
    log: ['error'],
  })
  clientCache.set(schemaName, client)
  return client
}

function getSlugFromCookieHeader(cookieHeader: string): string | null {
  try {
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)
    if (!match) return null
    const parts = match[1].split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload?.tenantSlug || null
  } catch { return null }
}

// For server components — resolves via next/headers (works in RSC context)
function resolveSchemaFromNextHeaders(): string {
  try {
    const h = headers()
    const slug = h.get('x-tenant-slug')
    if (slug && slug.length > 0) return `tenant_${slug}`
    const cookieHeader = h.get('cookie') || ''
    if (cookieHeader) {
      const slugFromJwt = getSlugFromCookieHeader(cookieHeader)
      if (slugFromJwt) return `tenant_${slugFromJwt}`
    }
    const host = h.get('host') || h.get('x-forwarded-host') || ''
    return getSchemaFromHost(host)
  } catch {
    return 'public'
  }
}

// For API routes — resolves directly from the NextRequest object (reliable)
export function getPrismaForTenant(request: { headers: { get(name: string): string | null }, cookies: { get(name: string): { value: string } | undefined } }): PrismaClient {
  // 1. x-tenant-slug set by middleware
  const slugHeader = request.headers.get('x-tenant-slug')
  if (slugHeader && slugHeader.length > 0) return getClient(`tenant_${slugHeader}`)
  // 2. JWT cookie on the request
  const token = request.cookies.get('token')?.value
  if (token) {
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
        if (payload?.tenantSlug) return getClient(`tenant_${payload.tenantSlug}`)
      }
    } catch {}
  }
  // 3. Host header fallback
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  return getClient(getSchemaFromHost(host))
}

// Proxy for server components (RSC pages, layouts) — uses next/headers
export const prisma = new Proxy({} as PrismaClient, {
  get(_: PrismaClient, prop: string) {
    const client = getClient(resolveSchemaFromNextHeaders())
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  }
})

export function getPrisma(slug?: string): PrismaClient {
  return getClient(slug ? `tenant_${slug}` : 'public')
}

export function getMasterPrisma(): PrismaClient {
  // Must use the actual master DB URL, not a tenant schema client
  const { getMasterPrisma: getMaster } = require('@/lib/get-prisma')
  return getMaster()
}

export default prisma
