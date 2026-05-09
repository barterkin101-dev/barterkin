import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ============================================================================
// Rate limiting with Upstash Redis (production) + in-memory fallback (dev)
// ============================================================================
// Configure via env vars:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
// ============================================================================

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token || url.includes('PLACEHOLDER')) return null
  return new Redis({ url, token })
}

const redis = getRedis()

// In-memory fallback for dev (not suitable for multi-instance production)
const memoryStore = new Map<string, { count: number; resetAt: number }>()

function memoryLimit(key: string, max: number, windowMs: number): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now()
  const existing = memoryStore.get(key)
  if (!existing || now > existing.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, limit: max, remaining: max - 1, reset: now + windowMs }
  }
  if (existing.count >= max) {
    return { success: false, limit: max, remaining: 0, reset: existing.resetAt }
  }
  existing.count += 1
  return { success: true, limit: max, remaining: max - existing.count, reset: existing.resetAt }
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export async function rateLimit(
  identifier: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  if (redis) {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds}s`),
      analytics: true,
    })
    const result = await ratelimit.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  }
  // Fallback to in-memory
  const result = memoryLimit(identifier, maxRequests, windowSeconds * 1000)
  return result
}

// Convenience presets for common actions
export async function limitCreateListing(userId: string): Promise<RateLimitResult> {
  return rateLimit(`create-listing:${userId}`, 10, 3600) // 10 per hour
}

export async function limitSendMessage(userId: string): Promise<RateLimitResult> {
  return rateLimit(`send-message:${userId}`, 60, 60) // 60 per minute
}

export async function limitSubmitRating(userId: string): Promise<RateLimitResult> {
  return rateLimit(`submit-rating:${userId}`, 20, 3600) // 20 per hour
}

export async function limitCreateTicket(userId: string): Promise<RateLimitResult> {
  return rateLimit(`create-ticket:${userId}`, 5, 3600) // 5 per hour
}

export async function limitCreateDispute(userId: string): Promise<RateLimitResult> {
  return rateLimit(`create-dispute:${userId}`, 3, 3600) // 3 per hour
}

// limitContactRequest was removed — the legacy email-based contact relay has been
// replaced by in-app messaging (limitSendMessage covers the new flow).
