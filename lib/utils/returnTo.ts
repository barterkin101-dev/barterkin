/**
 * safeReturnTo — validate a ?returnTo= query parameter for open-redirect prevention.
 *
 * Returns the input UNCHANGED when it is a safe same-origin relative path.
 * Returns undefined for anything that could redirect the user to an external site.
 *
 * Allowed: strings starting with a single `/` followed by anything that is NOT `/` (to block `//evil.com`).
 * Blocked: undefined, empty string, `//...` protocol-relative, `http://...`/`https://...`/`javascript:...`, paths not starting with `/`.
 *
 * Security: T-9-03 (open redirect via returnTo). Referenced by ProfileEditPage (Plan 03)
 * and any future page that accepts ?returnTo=.
 */
export function safeReturnTo(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  if (raw.length < 2) return undefined
  if (raw[0] !== '/') return undefined
  if (raw[1] === '/') return undefined // protocol-relative like //evil.com
  return raw
}
