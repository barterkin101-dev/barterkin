import 'server-only'
import { isDisposableEmail as _isDisposableEmail } from 'disposable-email-domains-js'

/**
 * AUTH-07: Check if an email address uses a known disposable/temporary domain.
 *
 * Uses disposable-email-domains-js (weekly-updated, 112KB blocklist).
 * This is the server-side trust gate — called inside sendMagicLink() before
 * invoking signInWithOtp. Fails OPEN on malformed input (no throw) — the
 * Postgres trigger on auth.users is defense-in-depth.
 *
 * Per A4-PROBE.md (Outcome B): the package exports isDisposableEmail(email: string)
 * as a named function that accepts the full email address (not just domain).
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  const atIndex = normalized.indexOf('@')
  if (atIndex === -1) return false
  const domain = normalized.slice(atIndex + 1)
  if (!domain) return false
  return _isDisposableEmail(normalized)
}
