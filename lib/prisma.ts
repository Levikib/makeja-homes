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

function resolveSchema(): string {
  try {
    const h = headers()
    const slug = h.get('x-tenant-slug')
    if (slug && slug.length > 0) return `tenant_${slug}`
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
