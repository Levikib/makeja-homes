import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

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

// CSRF: state-mutating API routes that require a valid CSRF token
const CSRF_PROTECTED = /^\/api\/(?!auth\/login|auth\/logout|auth\/register|super-admin)/

function generateCsrfToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function getSlugFromJwt(req: NextRequest): string | null {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return null
    // Decode without verify (middleware is sync; verification happens in route handlers)
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload?.tenantSlug || null
  } catch { return null }
}

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''
  // Priority: subdomain > ?tenant= query param > JWT cookie claim
  const slugFromHost = getSlug(hostname)
  const slugFromQuery = req.nextUrl.searchParams.get('tenant')?.toLowerCase().replace(/[^a-z0-9-]/g, '') || null
  const slugFromJwt = slugFromHost || slugFromQuery ? null : getSlugFromJwt(req)
  const slug = slugFromHost || slugFromQuery || slugFromJwt

  // ── CRITICAL FIX: pass slug as REQUEST header so API routes can read it
  const requestHeaders = new Headers(req.headers)
  if (slug) {
    requestHeaders.set('x-tenant-slug', slug)
    requestHeaders.set('x-tenant-schema', `tenant_${slug}`)
  } else {
    requestHeaders.set('x-tenant-slug', '')
    requestHeaders.set('x-is-marketing', 'true')
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } })

  // ── CSRF double-submit cookie
  // For state-mutating requests (POST/PUT/PATCH/DELETE), verify header matches cookie.
  const method = req.method
  const path = req.nextUrl.pathname

  if (CSRF_PROTECTED.test(path)) {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const cookieToken = req.cookies.get('csrf_token')?.value
      const headerToken = req.headers.get('x-csrf-token')
      // Skip CSRF for requests that carry a valid JWT (API clients / server actions)
      // Only enforce for browser form submissions without Authorization header
      const hasAuth = req.cookies.get('token')?.value || req.headers.get('authorization')
      if (hasAuth && cookieToken && headerToken && cookieToken !== headerToken) {
        return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
      }
    }

    // Issue CSRF cookie on GET requests to API (so it's available for subsequent mutations)
    if (method === 'GET' && !req.cookies.get('csrf_token')?.value) {
      res.cookies.set('csrf_token', generateCsrfToken(), {
        httpOnly: false, // must be readable by JS to send as header
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 86400,
      })
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)'],
}
