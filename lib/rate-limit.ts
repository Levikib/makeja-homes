/**
 * Simple in-process rate limiter using a sliding window.
 * Works in Next.js Edge middleware and Node.js API routes.
 * For multi-instance deployments, replace with Redis-backed store.
 */

type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

// Clean up expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key)
    }
  }, 60_000)
}

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number
  /** Window duration in seconds */
  window: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const windowMs = config.window * 1000
  const existing = store.get(key)

  if (!existing || existing.resetAt < now) {
    const entry: Entry = { count: 1, resetAt: now + windowMs }
    store.set(key, entry)
    return { success: true, limit: config.limit, remaining: config.limit - 1, resetAt: entry.resetAt }
  }

  if (existing.count >= config.limit) {
    return { success: false, limit: config.limit, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count++
  return { success: true, limit: config.limit, remaining: config.limit - existing.count, resetAt: existing.resetAt }
}

/** Pre-configured limiters */
export const limiters = {
  /** Auth endpoints: 10 attempts per 15 minutes per IP */
  auth: (ip: string) => rateLimit(`auth:${ip}`, { limit: 10, window: 900 }),

  /** API endpoints: 120 requests per minute per IP */
  api: (ip: string) => rateLimit(`api:${ip}`, { limit: 120, window: 60 }),

  /** Bulk/cron endpoints: 10 per minute */
  bulk: (ip: string) => rateLimit(`bulk:${ip}`, { limit: 10, window: 60 }),

  /** Onboarding: 5 per hour per IP */
  onboarding: (ip: string) => rateLimit(`onboarding:${ip}`, { limit: 5, window: 3600 }),

  /** Password reset: 5 requests per hour per IP — prevent email spam + enumeration */
  passwordReset: (ip: string) => rateLimit(`pwd_reset:${ip}`, { limit: 5, window: 3600 }),
}
