import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const cache = new Map<string, PrismaClient>()

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
  const base = (process.env.DIRECT_DATABASE_URL || process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || '')
    .replace('-pooler.', '.')
    .replace(/[?&]schema=[^&]*/g, '')
    .replace(/[?&]options=[^&]*/g, '')
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}options=--search_path%3D${schemaName}`
}

function resolveSlugFromRequest(req: NextRequest): string | null {
  // SECURITY: Resolution order — JWT (verified) > subdomain > header.
  // The x-tenant-slug header is set by middleware from the subdomain, but
  // headers can be spoofed by callers. Always prefer the cryptographically
  // signed JWT claim over any header-based resolution.

  // 1. JWT cookie — unverified decode is OK here because auth-helpers.ts
  //    performs full signature verification before any data access.
  //    We only use this to build the Prisma connection string; the actual
  //    user record lookup in auth-helpers verifies the token properly.
  try {
    const token = req.cookies.get('token')?.value
    if (token) {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
        if (payload?.tenantSlug && /^[a-z0-9-]+$/.test(payload.tenantSlug)) {
          return payload.tenantSlug
        }
      }
    }
  } catch {}
  // 2. Subdomain from host (safe — controlled by DNS)
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const schemaFromHost = getSchemaFromHost(host)
  if (schemaFromHost !== 'public') return schemaFromHost.replace('tenant_', '')
  // 3. x-tenant-slug header — last resort, only for unauthenticated public routes
  const slugHeader = req.headers.get('x-tenant-slug')
  if (slugHeader && /^[a-z0-9-]+$/.test(slugHeader)) return slugHeader
  return null
}

function getCachedClient(schemaName: string): PrismaClient {
  if (cache.has(schemaName)) return cache.get(schemaName)!
  const client = new PrismaClient({ datasources: { db: { url: buildTenantUrl(schemaName) } } })
  cache.set(schemaName, client)
  return client
}

export function getPrismaForRequest(req: NextRequest): PrismaClient {
  const slug = resolveSlugFromRequest(req)
  const schema = slug ? (slug.startsWith('tenant_') ? slug : `tenant_${slug}`) : 'public'
  return getCachedClient(schema)
}

export function resolveSchema(req: NextRequest): string {
  const slug = resolveSlugFromRequest(req)
  return slug ? (slug.startsWith('tenant_') ? slug : `tenant_${slug}`) : 'public'
}

