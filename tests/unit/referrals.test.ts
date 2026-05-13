import { describe, expect, it } from 'vitest'
import { buildReferralLink, normalizeReferralCode } from '@/lib/referrals'

describe('referrals', () => {
  it('normalizes lowercase referral codes', () => {
    expect(normalizeReferralCode(' ab12cd34 ')).toBe('AB12CD34')
  })

  it('rejects invalid referral codes', () => {
    expect(normalizeReferralCode('too-short')).toBeNull()
    expect(normalizeReferralCode('abcdefg!')).toBeNull()
  })

  it('builds stable referral links', () => {
    expect(buildReferralLink('https://barterkin.com/', 'ab12cd34')).toBe(
      'https://barterkin.com/r/AB12CD34',
    )
  })

  it('rejects building link with invalid code', () => {
    expect(() => buildReferralLink('https://barterkin.com/', 'short')).toThrow()
  })

  it('handles null/undefined/empty codes', () => {
    expect(normalizeReferralCode(null)).toBeNull()
    expect(normalizeReferralCode(undefined)).toBeNull()
    expect(normalizeReferralCode('')).toBeNull()
    expect(normalizeReferralCode('   ')).toBeNull()
  })

  it('accepts valid 8-char alphanumeric codes', () => {
    expect(normalizeReferralCode('A1B2C3D4')).toBe('A1B2C3D4')
    expect(normalizeReferralCode('12345678')).toBe('12345678')
    expect(normalizeReferralCode('ABCDEFGH')).toBe('ABCDEFGH')
  })

  it('rejects codes with lowercase after normalization', () => {
    // The regex only matches A-Z0-9, so lowercase gets uppercased first
    expect(normalizeReferralCode('a1b2c3d4')).toBe('A1B2C3D4')
  })
})
