import { describe, it, expect } from 'vitest'
import { safeReturnTo } from '@/lib/utils/returnTo'

describe('safeReturnTo (D-06 open-redirect prevention, T-9-03 mitigation)', () => {
  it('accepts a relative path with query', () => {
    expect(safeReturnTo('/onboarding?step=1')).toBe('/onboarding?step=1')
  })
  it('accepts /directory', () => {
    expect(safeReturnTo('/directory')).toBe('/directory')
  })
  it('returns undefined for undefined input', () => {
    expect(safeReturnTo(undefined)).toBeUndefined()
  })
  it('returns undefined for empty string', () => {
    expect(safeReturnTo('')).toBeUndefined()
  })
  it('rejects absolute https URL (open redirect)', () => {
    expect(safeReturnTo('https://evil.com')).toBeUndefined()
  })
  it('rejects protocol-relative URL (open redirect)', () => {
    expect(safeReturnTo('//evil.com/phish')).toBeUndefined()
  })
  it('rejects javascript: URL (XSS)', () => {
    expect(safeReturnTo('javascript:alert(1)')).toBeUndefined()
  })
  it('rejects relative path not starting with /', () => {
    expect(safeReturnTo('foo')).toBeUndefined()
  })
  it('preserves query + fragment on valid relative path', () => {
    expect(safeReturnTo('/foo/bar?a=1&b=2#frag')).toBe('/foo/bar?a=1&b=2#frag')
  })
})
