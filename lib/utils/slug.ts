/**
 * D-07, D-08 — auto-slug from display name; locked at first save (enforced
 * in the profile server action in Plan 03-03). The slug is the immutable
 * public identifier for a member's directory card.
 *
 * Algorithm:
 *   1. lowercase
 *   2. replace every run of non-alphanumeric chars with a single '-'
 *   3. strip leading/trailing '-'
 *   4. truncate to 40 chars
 *
 * Output shape is always `/^[a-z0-9-]{0,40}$/` by construction — no
 * injection vector, no Unicode leakage.
 */
export function generateSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
}
