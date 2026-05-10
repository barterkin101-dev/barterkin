/**
 * Input sanitization utilities for user-facing text fields.
 *
 * These are defense-in-depth helpers used alongside Zod schemas.
 * They strip control characters, normalize whitespace, and remove
 * HTML/script injection vectors before data reaches the database.
 *
 * Usage: pipe through sanitizeText() after Zod validation in server actions.
 */

const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g
const HTML_TAG_LIKE = /<[^>]*>/g
const MULTI_SPACE = /\s+/g

/**
 * Sanitize a plain-text user input:
 *   - strip control characters
 *   - strip HTML-like tags (defense-in-depth; UI never renders raw HTML anyway)
 *   - normalize whitespace runs to a single space
 *   - trim
 */
export function sanitizeText(input: string | null | undefined): string {
  if (input == null) return ''
  return input
    .replace(CONTROL_CHARS, '')
    .replace(HTML_TAG_LIKE, '')
    .replace(MULTI_SPACE, ' ')
    .trim()
}

/**
 * Sanitize a multi-line text input (bio, description, etc).
 * Preserves single newlines; collapses runs of whitespace (including newlines)
 * to a single space or single newline depending on context.
 */
export function sanitizeMultiline(input: string | null | undefined): string {
  if (input == null) return ''
  return input
    .replace(CONTROL_CHARS, '')
    .replace(HTML_TAG_LIKE, '')
    .replace(/[ \t]+\n/g, '\n') // trim trailing spaces before newline
    .replace(/\n[ \t]+/g, '\n') // trim leading spaces after newline
    .replace(/\n{3,}/g, '\n\n') // cap consecutive newlines at 2
    .replace(/ {2,}/g, ' ') // collapse multiple spaces
    .trim()
}

/**
 * Strict slug-like sanitization for usernames, handles, etc.
 * Lowercase, alphanumeric + limited safe chars only.
 */
export function sanitizeSlugLike(input: string | null | undefined): string {
  if (input == null) return ''
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '')
    .slice(0, 60)
}

/**
 * Validate an image URL is a safe, expected pattern.
 * Only allows Supabase Storage public URLs or data URIs from known safe sources.
 */
export function isSafeImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  // Supabase storage public URL pattern
  const supabaseStoragePattern =
    /^https:\/\/[-a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/[-a-z0-9_]+\/[-a-zA-Z0-9_/.]+$/
  // Data URI for images (base64) — only allow if needed; currently reject
  if (url.startsWith('data:')) return false
  return supabaseStoragePattern.test(url)
}
