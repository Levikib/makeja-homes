// ═══════════════════════════════════════════════════════════
// middleware.ts  (ROOT of project — replaces existing middleware)
//
// Runs on EVERY request before anything else.
// Reads the subdomain → injects tenant context into headers.
//
// Subdomain routing:
//   www.makejahomes.co.ke      → marketing site (app/page.tsx)
//   app.makejahomes.co.ke      → super admin dashboard
//   mizpha.makejahomes.co.ke   → Mizpha Rentals tenant app
//   localhost:3000             → dev (no subdomain = marketing)
//   localhost:3000 + x-tenant  → dev tenant testing
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'

// Subdomains that are NOT tenant slugs
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',        // super admin
  'api',        // future API subdomain
  'docs',       // future docs
  'status',     // future status page
  'mail',
  'smtp',
])

// Routes that are always public (no auth/tenant needed)
const PUBLIC_PATHS = new Set([
  '/',
  '/contact',
  '/pricing',
  '/features',
  '/about',
  '/blog',
  '/privacy',
  '/terms',
  '/security',
  '/cookies',
])

// Auth paths (public but tenant-aware)
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hostname = req.headers.get('host') || ''

  // ── Extract subdomain ──────────────────────────────────────
  const slug = extractTenantSlug(hostname)

  // ── Create response with tenant context injected ───────────
  const res = NextResponse.next()

  // Inject tenant slug into request headers
  // Available in all server components and API routes as:
  // headers().get('x-tenant-slug')
  if (slug) {
    res.headers.set('x-tenant-slug', slug)
    res.headers.set('x-tenant-schema', `tenant_${slug}`)
  }

  // Mark if this is a marketing (no-tenant) request
  if (!slug) {
    res.headers.set('x-tenant-slug', '')
    res.headers.set('x-is-marketing', 'true')
  }

  // ── Super admin routing ────────────────────────────────────
  if (slug === null && isAppSubdomain(hostname)) {
    // app.makejahomes.co.ke → super admin area
    res.headers.set('x-is-super-admin', 'true')
    return res
  }

  // ── Marketing site ─────────────────────────────────────────
  if (!slug) {
    // No subdomain = marketing site — always accessible
    return res
  }

  // ── Tenant request ─────────────────────────────────────────
  // Let the request through — actual tenant validation happens
  // in the auth middleware (lib/auth.ts) and API routes.
  // We don't block here to avoid Neon roundtrip on every request.
  return res
}

/**
 * Extract tenant slug from hostname.
 * Returns null if no tenant subdomain (marketing site).
 * Returns the slug string if tenant subdomain found.
 */
function extractTenantSlug(hostname: string): string | null {
  // Development: use x-tenant-slug header or TENANT env var
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    const devTenant = process.env.DEV_TENANT_SLUG
    return devTenant || null
  }

  // Vercel preview URLs — treat as no-tenant
  if (hostname.includes('vercel.app')) {
    return null
  }

  // Production: extract subdomain from makejahomes.co.ke
  // mizpha.makejahomes.co.ke → "mizpha"
  const parts = hostname.split('.')

  // co.ke = 2 parts, makejahomes.co.ke = 3 parts
  // subdomain.makejahomes.co.ke = 4 parts
  if (parts.length < 4) {
    return null // www.makejahomes.co.ke or makejahomes.co.ke
  }

  const subdomain = parts[0].toLowerCase()

  // Skip reserved subdomains
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return null
  }

  // Basic slug validation: lowercase alphanumeric + hyphens
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return null
  }

  return subdomain
}

/**
 * Check if this is the super admin subdomain
 */
function isAppSubdomain(hostname: string): boolean {
  return hostname.startsWith('app.') && hostname.includes('makejahomes')
}

// ── Middleware matcher ─────────────────────────────────────────
// Run on all routes except static files and Next.js internals
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)',
  ],
}
