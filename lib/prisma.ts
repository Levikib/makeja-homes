import { PrismaClient } from '@prisma/client'
import { headers } from 'next/headers'

const clientCache = new Map<string, PrismaClient>()

function buildUrl(schemaName: string): string {
  const base = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!
  const clean = base.replace(/[?&]schema=[^&]*/g, '')
  const sep = clean.includes('?') ? '&' : '?'
  return `${clean}${sep}schema=${schemaName}`
}

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
    datasources: { db: { url: buildUrl(schemaName) } },
    log: ['error'],
  })
  clientCache.set(schemaName, client)
  return client
}

function resolveSchema(): string {
  try {
    const slug = headers().get('x-tenant-slug')
    if (slug && slug.length > 0) return `tenant_${slug}`
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
