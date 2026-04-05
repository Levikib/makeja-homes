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
  // 1. x-tenant-slug set by middleware
  const slugHeader = req.headers.get('x-tenant-slug')
  if (slugHeader && slugHeader.length > 0) return slugHeader
  // 2. JWT cookie
  try {
    const token = req.cookies.get('token')?.value
    if (token) {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
        if (payload?.tenantSlug) return payload.tenantSlug
      }
    }
  } catch {}
  // 3. Subdomain from host
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const schemaFromHost = getSchemaFromHost(host)
  if (schemaFromHost !== 'public') return schemaFromHost.replace('tenant_', '')
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
