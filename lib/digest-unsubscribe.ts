import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createLogger } from '@/lib/utils/logger'

const log = createLogger('digest-unsubscribe')

const TOKEN_VERSION = 'v1'
const TOKEN_SEPARATOR = ':'

function getUnsubscribeSecret(): string {
  const secret = process.env.DIGEST_UNSUBSCRIBE_SECRET
  if (!secret) {
    throw new Error('DIGEST_UNSUBSCRIBE_SECRET is not configured.')
  }
  return secret
}

/**
 * Generate a one-time unsubscribe token for a profile.
 * Token format: v1:<base64-hmac>
 * The HMAC is computed over the profile_id + secret.
 */
export function generateUnsubscribeToken(profileId: string): string {
  const secret = getUnsubscribeSecret()
  const hmac = createHmac('sha256', secret).update(profileId).digest('base64url')
  return `${TOKEN_VERSION}${TOKEN_SEPARATOR}${hmac}`
}

/**
 * Validate an unsubscribe token against a profile_id.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function validateUnsubscribeToken(
  profileId: string,
  token: string,
): boolean {
  try {
    const parts = token.split(TOKEN_SEPARATOR)
    if (parts.length !== 2 || parts[0] !== TOKEN_VERSION) {
      return false
    }

    const expected = generateUnsubscribeToken(profileId)
    const expectedBuf = Buffer.from(expected, 'utf8')
    const actualBuf = Buffer.from(token, 'utf8')

    if (expectedBuf.length !== actualBuf.length) {
      return false
    }

    return timingSafeEqual(expectedBuf, actualBuf)
  } catch (err) {
    log.warn('Token validation error', { error: err, context: { profile_id: profileId } })
    return false
  }
}

/**
 * Build the full unsubscribe URL for a profile.
 */
export function buildUnsubscribeUrl(profileId: string, siteUrl: string): string {
  const token = generateUnsubscribeToken(profileId)
  const url = new URL('/unsubscribe', siteUrl)
  url.searchParams.set('id', profileId)
  url.searchParams.set('token', token)
  return url.toString()
}

/**
 * Build unsubscribe URL safely — returns null if secret is missing.
 * Use this in contexts where a missing secret should not crash the caller.
 */
export function safeBuildUnsubscribeUrl(profileId: string, siteUrl: string): string | null {
  try {
    return buildUnsubscribeUrl(profileId, siteUrl)
  } catch {
    return null
  }
}
