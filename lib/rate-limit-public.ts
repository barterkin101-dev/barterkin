import 'server-only'
import { headers } from 'next/headers'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ============================================================================
// IP-based rate limiting for public / unauthenticated endpoints
// ============================================================================
// Uses Upstash Redis in production, in-memory Map fallback in dev.
//
// Why IP-based for public endpoints?
//   - Unauthenticated users have no userId to key on
//   - IP is the best available identifier (behind CDN/proxy)
//   - X-Forwarded-For header parsing handles Cloudflare/Vercel edge
//
// Limitations:
//   - IPv6 / NAT / mobile networks may share IPs across many users
//   - Tor exit nodes, VPNs, corporate proxies — keep limits generous
//   - Consider adding Turnstile/Captcha for truly sensitive endpoints
//
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

function memoryLimit(
  key: string,
  max: number,
  windowMs: number,
): { success: boolean; limit: number; remaining: number; reset: number } {
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

export async function rateLimitByIp(
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

/**
 * Extract client IP from request headers.
 * Handles Vercel Edge, Cloudflare, and standard proxy headers.
 * Returns 'unknown' if no IP can be determined.
 */
export async function getClientIp(): Promise<string> {
  try {
    const hdrs = await headers()
    // Vercel / Cloudflare / common proxies
    const forwarded = hdrs.get('x-forwarded-for')
    if (forwarded) {
      // X-Forwarded-For can be a comma-separated list; first is typically the client
      const first = forwarded.split(',')[0].trim()
      if (first) return first
    }
    // Fallback headers
    const realIp = hdrs.get('x-real-ip')
    if (realIp) return realIp.trim()
    const cfConnectingIp = hdrs.get('cf-connecting-ip')
    if (cfConnectingIp) return cfConnectingIp.trim()
  } catch {
    // headers() throws outside a request scope (e.g. unit tests, edge cases)
    // Return 'unknown' so rate limiting gracefully degrades to memory fallback
  }
  return 'unknown'
}

// ============================================================================
// Presets for common public endpoint rate limits
// ============================================================================

/** Magic link / signup requests: 5 per 15 min per IP (generous but protective) */
export async function limitAuthRequest(ip: string): Promise<RateLimitResult> {
  return rateLimitByIp(`auth:${ip}`, 5, 900)
}

/** OAuth callback verification: 20 per 5 min per IP */
export async function limitOAuthCallback(ip: string): Promise<RateLimitResult> {
  return rateLimitByIp(`oauth:${ip}`, 20, 300)
}

/** Chatbot messages (unauthenticated): 30 per minute per IP */
export async function limitChatbotMessage(ip: string): Promise<RateLimitResult> {
  return rateLimitByIp(`chatbot:${ip}`, 30, 60)
}

/** Report submissions: 5 per hour per IP */
export async function limitReportSubmission(ip: string): Promise<RateLimitResult> {
  return rateLimitByIp(`report:${ip}`, 5, 3600)
}

/** Block actions: 10 per hour per IP */
export async function limitBlockAction(ip: string): Promise<RateLimitResult> {
  return rateLimitByIp(`block:${ip}`, 10, 3600)
}

/** General API abuse prevention (fallback): 100 per minute per IP */
export async function limitGeneralApi(ip: string): Promise<RateLimitResult> {
  return rateLimitByIp(`api:${ip}`, 100, 60)
}
