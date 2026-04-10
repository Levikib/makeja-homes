/**
 * Rate limiter — Upstash Redis when configured, in-memory fallback otherwise.
 *
 * To enable persistent rate limiting across all serverless instances:
 *   1. Create a free Redis database at https://console.upstash.com
 *   2. Add to .env.local:
 *        UPSTASH_REDIS_REST_URL=https://...upstash.io
 *        UPSTASH_REDIS_REST_TOKEN=...
 *   3. Deploy — no code changes needed.
 *
 * Without those env vars the limiter uses an in-memory sliding window which
 * resets per cold start (fine for dev; not for production).
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

// ── In-memory fallback (used when Upstash is not configured) ──────────────────

type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key)
    }
  }, 60_000)
}

function inMemoryLimit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now()
  const windowMs = windowSec * 1000
  const existing = store.get(key)
  if (!existing || existing.resetAt < now) {
    const entry: Entry = { count: 1, resetAt: now + windowMs }
    store.set(key, entry)
    return { success: true, limit, remaining: limit - 1, resetAt: entry.resetAt }
  }
  if (existing.count >= limit) {
    return { success: false, limit, remaining: 0, resetAt: existing.resetAt }
  }
  existing.count++
  return { success: true, limit, remaining: limit - existing.count, resetAt: existing.resetAt }
}

// ── Upstash limiter factory (lazy — only created if env vars present) ─────────

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}

// Cache Ratelimit instances (one per (limit, window) combo)
const rlCache = new Map<string, Ratelimit>()

function getUpstashLimiter(limit: number, windowSec: number): Ratelimit {
  const key = `${limit}:${windowSec}`
  if (rlCache.has(key)) return rlCache.get(key)!
  const rl = new Ratelimit({
    redis: getRedis()!,
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    analytics: false,
  })
  rlCache.set(key, rl)
  return rl
}

async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const redis = getRedis()
  if (redis) {
    try {
      const rl = getUpstashLimiter(limit, windowSec)
      const result = await rl.limit(key)
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        resetAt: result.reset,
      }
    } catch (err) {
      // Upstash unavailable — fall through to in-memory
      console.warn("[rate-limit] Upstash error, falling back to in-memory:", (err as any)?.message)
    }
  }
  return inMemoryLimit(key, limit, windowSec)
}

// ── Pre-configured limiters ────────────────────────────────────────────────────

export const limiters = {
  /** Login: 10 attempts per 15 min per IP */
  auth: (ip: string) => rateLimit(`auth:${ip}`, 10, 900),

  /** General API: 120 requests per minute per IP */
  api: (ip: string) => rateLimit(`api:${ip}`, 120, 60),

  /** Bulk/cron: 10 per minute */
  bulk: (ip: string) => rateLimit(`bulk:${ip}`, 10, 60),

  /** Onboarding: 5 per hour per IP */
  onboarding: (ip: string) => rateLimit(`onboarding:${ip}`, 5, 3600),

  /** Password reset: 5 per hour per IP — prevents email spam + enumeration */
  passwordReset: (ip: string) => rateLimit(`pwd_reset:${ip}`, 5, 3600),
}
