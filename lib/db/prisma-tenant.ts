import { PrismaClient } from '@prisma/client'

const tenantClients = new Map<string, PrismaClient>()
const MAX_CACHED_CLIENTS = 20

export function getTenantPrisma(slug: string): PrismaClient {
  const schemaName = `tenant_${slug}`
  if (tenantClients.has(schemaName)) return tenantClients.get(schemaName)!

  if (tenantClients.size >= MAX_CACHED_CLIENTS) {
    const firstEntry = tenantClients.keys().next()
    if (!firstEntry.done && firstEntry.value !== undefined) {
      tenantClients.get(firstEntry.value)?.$disconnect()
      tenantClients.delete(firstEntry.value)
    }
  }

  // Must use direct (non-pooler) URL — PgBouncer does not forward `options`
  const directUrl = (process.env.DIRECT_DATABASE_URL || process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL!)
    .replace('-pooler.', '.')
    .replace(/[?&]schema=[^&]*/g, '')
    .replace(/[?&]options=[^&]*/g, '')
  const sep = directUrl.includes('?') ? '&' : '?'
  const tenantUrl = `${directUrl}${sep}options=--search_path%3D${schemaName}`

  const client = new PrismaClient({
    datasources: { db: { url: tenantUrl } },
    log: ['error'],
  })

  tenantClients.set(schemaName, client)
  return client
}

export async function disconnectAllTenantClients() {
  await Promise.all(Array.from(tenantClients.values()).map(c => c.$disconnect()))
  tenantClients.clear()
}

export async function tenantSchemaExists(slug: string): Promise<boolean> {
  try {
    const prisma = getTenantPrisma(slug)
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
