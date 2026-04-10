/**
 * JWT revocation via jti (JWT ID) blocklist.
 *
 * On logout, the token's jti is added to this store.
 * Every protected route checks the blocklist before trusting the token.
 *
 * Storage: Upstash Redis when configured (persists across instances),
 * in-memory Set otherwise (revocations lost on cold start — acceptable for dev).
 *
 * TTL: jti entries expire after 25 hours (slightly longer than JWT maxAge of 24h)
 * so there's no gap where a revoked token could slip through.
 */

import { Redis } from "@upstash/redis"

const BLOCKLIST_TTL_SEC = 25 * 60 * 60 // 25 hours

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

// In-memory fallback — does not survive cold starts
const memoryBlocklist = new Set<string>()

export async function revokeToken(jti: string): Promise<void> {
  const redis = getRedis()
  if (redis) {
    try {
      await redis.set(`blocklist:${jti}`, "1", { ex: BLOCKLIST_TTL_SEC })
      return
    } catch (err) {
      console.warn("[blocklist] Redis error on revoke, falling back to memory:", (err as any)?.message)
    }
  }
  memoryBlocklist.add(jti)
  // Clean up old in-memory entries after TTL (best-effort)
  setTimeout(() => memoryBlocklist.delete(jti), BLOCKLIST_TTL_SEC * 1000)
}

export async function isRevoked(jti: string): Promise<boolean> {
  const redis = getRedis()
  if (redis) {
    try {
      const val = await redis.get(`blocklist:${jti}`)
      return val !== null
    } catch (err) {
      console.warn("[blocklist] Redis error on check, falling back to memory:", (err as any)?.message)
    }
  }
  return memoryBlocklist.has(jti)
}
