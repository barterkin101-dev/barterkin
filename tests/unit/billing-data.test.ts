import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPremiumBillingInterval } from '@/lib/data/billing'

describe('getPremiumBillingInterval', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns monthly for monthly premium members', () => {
    expect(getPremiumBillingInterval('premium', 'monthly')).toBe('monthly')
  })

  it('returns annual for annual premium members', () => {
    expect(getPremiumBillingInterval('premium', 'annual')).toBe('annual')
  })

  it('returns null for free, founding, and malformed interval values', () => {
    expect(getPremiumBillingInterval('free', 'monthly')).toBeNull()
    expect(getPremiumBillingInterval('founding', 'monthly')).toBeNull()
    expect(getPremiumBillingInterval('premium', null)).toBeNull()
    expect(getPremiumBillingInterval('premium', 'week')).toBeNull()
  })
})
