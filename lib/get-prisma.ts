import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const cache = new Map<string, PrismaClient>()

// Singleton master prisma that targets the public schema
let _masterPrisma: PrismaClient | undefined

export function getMasterPrisma(): PrismaClient {
  if (_masterPrisma) return _masterPrisma
  const url = (process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || '')
    .replace('-pooler.', '.')
  _masterPrisma = new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  })
  return _masterPrisma
}

export function getSchemaFromHost(host: string): string {
  const parts = host.split('.')
  if (parts.length >= 4) {
    const sub = parts[0].toLowerCase()
    if (!['www','app','api'].includes(sub) && /^[a-z0-9-]+$/.test(sub)) {
      return `tenant_${sub}`
    }
  }
  return 'public'
}

export function buildTenantUrl(schemaName: string): string {
  // MUST use direct connection (not pooler) for search_path
  // search_path preserves global enum types (no schema prefix on enums)
  const base = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '')
    .replace('-pooler.', '.')
    .replace(/[?&]schema=[^&]*/g, '')
    .replace(/[?&]options=[^&]*/g, '')
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}options=--search_path%3D${schemaName}`
}

function getSlugFromJwt(req: NextRequest): string | null {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload?.tenantSlug || null
  } catch { return null }
}

export function getPrismaForRequest(req: NextRequest): PrismaClient {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const schemaFromHost = getSchemaFromHost(host)
  // If host didn't resolve a tenant (no subdomain), fall back to JWT claim
  const schema = schemaFromHost !== 'public'
    ? schemaFromHost
    : (() => {
        const slug = req.headers.get('x-tenant-slug') || getSlugFromJwt(req)
        return slug ? `tenant_${slug}` : 'public'
      })()
  if (cache.has(schema)) return cache.get(schema)!
  const client = new PrismaClient({ datasources: { db: { url: buildTenantUrl(schema) } } })
  cache.set(schema, client)
  return client
}
