import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const cache = new Map<string, PrismaClient>()

export function getPrismaForRequest(req: NextRequest): PrismaClient {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  const parts = host.split('.')
  let schema = 'public'
  if (parts.length >= 4) {
    const sub = parts[0].toLowerCase()
    if (!['www','app','api'].includes(sub) && /^[a-z0-9-]+$/.test(sub)) {
      schema = `tenant_${sub}`
    }
  }
  if (cache.has(schema)) return cache.get(schema)!
  const base = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || ''
  const clean = base.replace(/[?&]schema=[^&]*/g, '')
  const sep = clean.includes('?') ? '&' : '?'
  const client = new PrismaClient({
    datasources: { db: { url: `${clean}${sep}schema=${schema}` } }
  })
  cache.set(schema, client)
  return client
}
