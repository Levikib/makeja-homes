import { PrismaClient } from '@prisma/client'
import { headers } from 'next/headers'
import { buildTenantUrl, getSchemaFromHost } from '@/lib/get-prisma'

const clientCache = new Map<string, PrismaClient>()

function getClient(schemaName: string): PrismaClient {
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

function resolveSchema(): string {
  try {
    const h = headers()
    const slug = h.get('x-tenant-slug')
    if (slug && slug.length > 0) return `tenant_${slug}`
    // Fall back to JWT cookie claim (works in both server components and API routes)
    const cookieHeader = h.get('cookie') || ''
    const slugFromJwt = getSlugFromCookieHeader(cookieHeader)
    if (slugFromJwt) return `tenant_${slugFromJwt}`
    const host = h.get('host') || h.get('x-forwarded-host') || ''
    return getSchemaFromHost(host)
  } catch {}
  return 'public'
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_: PrismaClient, prop: string) {
    const client = getClient(resolveSchema())
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  }
})

export function getPrisma(slug?: string): PrismaClient {
  return getClient(slug ? `tenant_${slug}` : 'public')
}

export function getMasterPrisma(): PrismaClient {
  return getClient('public')
}

export default prisma
