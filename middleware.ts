import { NextRequest, NextResponse } from 'next/server'

const RESERVED = new Set(['www', 'app', 'api', 'docs', 'status', 'mail', 'smtp'])

function getSlug(hostname: string): string | null {
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return process.env.DEV_TENANT_SLUG || null
  }
  if (hostname.includes('vercel.app')) return null
  const parts = hostname.split('.')
  // swiss.makejahomes.co.ke = 4 parts
  if (parts.length < 4) return null
  const sub = parts[0].toLowerCase()
  if (RESERVED.has(sub)) return null
  if (!/^[a-z0-9-]+$/.test(sub)) return null
  return sub
}

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''
  const slug = getSlug(hostname)

  // ── CRITICAL FIX: pass slug as REQUEST header so API routes can read it
  const requestHeaders = new Headers(req.headers)
  if (slug) {
    requestHeaders.set('x-tenant-slug', slug)
    requestHeaders.set('x-tenant-schema', `tenant_${slug}`)
  } else {
    requestHeaders.set('x-tenant-slug', '')
    requestHeaders.set('x-is-marketing', 'true')
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)'],
}
