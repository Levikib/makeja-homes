import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  const h = headers()
  
  const host = h.get('host') || req.headers.get('host') || ''
  const xForwardedHost = h.get('x-forwarded-host') || ''
  const xTenantSlug = h.get('x-tenant-slug') || ''
  
  // Parse slug from host
  const effectiveHost = xForwardedHost || host
  const parts = effectiveHost.split('.')
  const slug = parts.length >= 4 ? parts[0] : null
  const schemaName = slug ? `tenant_${slug}` : 'public'
  
  // Build direct URL
  const baseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || ''
  const directUrl = baseUrl.replace('-pooler.', '.')
  const sep = directUrl.includes('?') ? '&' : '?'
  const tenantUrl = `${directUrl}${sep}options=--search_path%3D${schemaName}`

  const result: any = {
    host,
    xForwardedHost,
    xTenantSlug,
    effectiveHost,
    slug,
    schemaName,
    urlUsed: tenantUrl.substring(0, 60) + '...',
  }

  try {
    const prisma = new PrismaClient({ datasources: { db: { url: tenantUrl } } })
    
    // Check if user exists
    const user = await prisma.users.findUnique({ where: { email: email.toLowerCase() } })
    result.userFound = !!user
    result.userEmail = user?.email || null
    result.userActive = user?.isActive || null
    result.userRole = user?.role || null
    
    if (user && password) {
      const passwordMatch = await bcrypt.compare(password, user.password)
      result.passwordMatch = passwordMatch
    }
    
    await prisma.$disconnect()
  } catch (err: any) {
    result.dbError = err.message
  }

  return NextResponse.json(result)
}

export async function GET(req: NextRequest) {
  const h = headers()
  const host = h.get('host') || req.headers.get('host') || ''
  const xForwardedHost = h.get('x-forwarded-host') || ''
  const parts = (xForwardedHost || host).split('.')
  const slug = parts.length >= 4 ? parts[0] : null

  return NextResponse.json({
    host,
    xForwardedHost,
    'x-tenant-slug': h.get('x-tenant-slug'),
    resolvedSlug: slug,
    resolvedSchema: slug ? `tenant_${slug}` : 'public',
    DIRECT_DATABASE_URL_SET: !!process.env.DIRECT_DATABASE_URL,
    DATABASE_URL_prefix: (process.env.DATABASE_URL || '').substring(0, 50),
  })
}
