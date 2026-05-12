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
})
