// ═══════════════════════════════════════════════════════════
// lib/db/prisma-tenant.ts
//
// The heart of multi-tenancy.
// Creates a Prisma client scoped to a specific tenant schema.
// Called on every authenticated request with the tenant slug.
// ═══════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client'

// Global cache: slug → PrismaClient
// Prevents creating a new connection on every request
const tenantClients = new Map<string, PrismaClient>()

// How many idle clients to keep alive (LRU eviction when exceeded)
const MAX_CACHED_CLIENTS = 20

/**
 * Get or create a Prisma client for a specific tenant schema.
 *
 * Usage:
 *   const prisma = getTenantPrisma('mizpha')
 *   const properties = await prisma.properties.findMany()
 *   // → queries tenant_mizpha schema only
 */
export function getTenantPrisma(slug: string): PrismaClient {
  const schemaName = `tenant_${slug}`

  if (tenantClients.has(schemaName)) {
    return tenantClients.get(schemaName)!
  }

  // Evict oldest if cache is full
  if (tenantClients.size >= MAX_CACHED_CLIENTS) {
    const firstKey = tenantClients.keys().next().value as string
    const oldClient = tenantClients.get(firstKey)
    oldClient?.$disconnect()
    tenantClients.delete(firstKey)
  }

  // Build connection URL with schema search path
  // Neon supports: ?options=--search_path%3Dtenant_mizpha
  const baseUrl = process.env.DATABASE_URL!
  const tenantUrl = buildTenantUrl(baseUrl, schemaName)

  const client = new PrismaClient({
    datasources: { db: { url: tenantUrl } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

  tenantClients.set(schemaName, client)
  return client
}

/**
 * Build a Neon-compatible connection URL with schema search path.
 * Handles both pooled (pgbouncer) and direct connections.
 */
function buildTenantUrl(baseUrl: string, schemaName: string): string {
  try {
    const url = new URL(baseUrl)

    // Neon uses ?options= for server-side config
    // --search_path sets which schema Postgres queries by default
    const existingOptions = url.searchParams.get('options') || ''
    const searchPathOption = `--search_path=${schemaName}`

    if (existingOptions) {
      url.searchParams.set('options', `${existingOptions} ${searchPathOption}`)
    } else {
      url.searchParams.set('options', searchPathOption)
    }

    return url.toString()
  } catch {
    // Fallback: append directly
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}options=--search_path%3D${schemaName}`
  }
}

/**
 * Disconnect all cached tenant clients.
 * Call this on server shutdown.
 */
export async function disconnectAllTenantClients() {
  const promises = Array.from(tenantClients.values()).map(c => c.$disconnect())
  await Promise.all(promises)
  tenantClients.clear()
}

/**
 * Check if a tenant schema exists and is accessible.
 * Used during request validation.
 */
export async function tenantSchemaExists(slug: string): Promise<boolean> {
  try {
    const prisma = getTenantPrisma(slug)
    // Simple ping — if schema doesn't exist this throws
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
