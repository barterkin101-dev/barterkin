import 'server-only'
import { createClient } from '@/lib/supabase/server'

export interface RateLimitResult {
  allowed: boolean
}

/**
 * AUTH-06: Per-IP signup rate limit (5/day).
 *
 * Calls the Postgres SECURITY DEFINER function `check_signup_ip` which:
 *   1. Increments the per-IP per-day counter in public.signup_attempts
 *   2. Returns true if count <= 5, false otherwise
 *   3. Opportunistically prunes rows older than 7 days
 *
 * Fails OPEN: if the RPC errors (DB down, migration not yet applied, etc.),
 * returns { allowed: true } so legitimate signups are not blocked.
 * Turnstile + the Postgres trigger are the primary defenses; this counter
 * is secondary. Per RESEARCH Pitfall 10.
 */
export async function checkSignupRateLimit(ip: string): Promise<RateLimitResult> {
  const cleanIp = (ip && typeof ip === 'string' ? ip.trim() : '') || 'unknown'

  const supabase = await createClient()
  // @ts-expect-error - types regenerated in Wave 3 after migration push (Task 4.2)
  const { data, error } = await supabase.rpc('check_signup_ip', { p_ip: cleanIp })

  if (error) {
    // Fail OPEN — do not block legitimate signups on a broken rate-limiter.
    console.error('[rate-limit] check_signup_ip RPC failed', {
      ip_prefix: cleanIp.slice(0, 8),
      code: error.code,
      message: error.message,
    })
    return { allowed: true }
  }

  return { allowed: data === true }
}
