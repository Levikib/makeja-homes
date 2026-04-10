import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

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

// CSRF: all state-mutating API routes except explicit exclusions
const CSRF_EXCLUDED = /^\/api\/(auth\/login|auth\/logout|auth\/register|paystack\/webhook|super-admin)/

function generateCsrfToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Read slug from JWT — verified signature
async function getSlugFromVerifiedJwt(req: NextRequest): Promise<string | null> {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const slug = payload.tenantSlug as string | undefined
    if (slug && /^[a-z0-9-]+$/.test(slug)) return slug
    return null
  } catch {
    return null
  }
}

// Read mustChangePassword from verified JWT
async function getMustChangePassword(req: NextRequest): Promise<boolean> {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) return false
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.mustChangePassword === true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''
  const currentPath = req.nextUrl.pathname
  const method = req.method

  // ── Resolve tenant slug: subdomain > verified JWT
  const slugFromHost = getSlug(hostname)
  const slugFromQuery = req.nextUrl.searchParams.get('tenant')?.toLowerCase().replace(/[^a-z0-9-]/g, '') || null
  // Only fall back to JWT slug if subdomain/query not present
  const slug = slugFromHost || slugFromQuery || (await getSlugFromVerifiedJwt(req))

  const requestHeaders = new Headers(req.headers)
  if (slug) {
    requestHeaders.set('x-tenant-slug', slug)
    requestHeaders.set('x-tenant-schema', `tenant_${slug}`)
  } else {
    requestHeaders.set('x-tenant-slug', '')
    requestHeaders.set('x-is-marketing', 'true')
  }

  // ── Force password change before dashboard access
  const isDashboard = currentPath.startsWith('/dashboard')
  const isChangePassword = currentPath.startsWith('/auth/change-password')
  if (isDashboard && !isChangePassword) {
    const mustChange = await getMustChangePassword(req)
    if (mustChange) {
      const url = req.nextUrl.clone()
      url.pathname = '/auth/change-password'
      url.search = '?firstLogin=true'
      return NextResponse.redirect(url)
    }
  }

  // ── CSRF double-submit cookie
  const isApiRoute = currentPath.startsWith('/api/')
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
  const isCsrfExcluded = CSRF_EXCLUDED.test(currentPath)

  if (isApiRoute && isMutating && !isCsrfExcluded) {
    const cookieToken = req.cookies.get('csrf_token')?.value
    const headerToken = req.headers.get('x-csrf-token')
    const hasAuth = req.cookies.get('token')?.value || req.headers.get('authorization')

    if (hasAuth) {
      // Authenticated mutation: MUST have matching CSRF tokens
      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return NextResponse.json({ error: 'CSRF token missing or invalid' }, { status: 403 })
      }
    }
    // Unauthenticated mutations (e.g. public sign-lease) don't need CSRF —
    // they are either signed with a one-time token in the URL or are not sensitive.
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } })

  // ── Issue CSRF cookie if not present
  if (isApiRoute && method === 'GET' && !req.cookies.get('csrf_token')?.value) {
    res.cookies.set('csrf_token', generateCsrfToken(), {
      httpOnly: false, // must be JS-readable to send as header
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 86400,
    })
  }

  // ── Security headers on every response
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)'],
}
