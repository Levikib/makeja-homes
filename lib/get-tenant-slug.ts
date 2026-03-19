import { headers } from 'next/headers'

export function getTenantSlugFromHost(): string | null {
  try {
    // Try middleware-injected header first
    const slug = headers().get('x-tenant-slug')
    if (slug && slug.length > 0) return slug

    // Fallback: parse from host header directly
    const host = headers().get('host') || ''
    if (host.includes('localhost')) return process.env.DEV_TENANT_SLUG || null
    
    const parts = host.split('.')
    // swiss.makejahomes.co.ke = 4 parts
    if (parts.length < 4) return null
    
    const reserved = new Set(['www', 'app', 'api', 'docs', 'status'])
    const sub = parts[0].toLowerCase()
    if (reserved.has(sub)) return null
    if (!/^[a-z0-9-]+$/.test(sub)) return null
    
    return sub
  } catch {
    return null
  }
}
