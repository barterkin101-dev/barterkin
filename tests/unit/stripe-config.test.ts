import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatUsdFromCents, getPremiumAnnualSavings } from '@/lib/stripe/config'

describe('stripe config', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('returns a placeholder publishable key in test when env is missing', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', '')

    const { getStripePublishableKey } = await import('@/lib/stripe/config')

    expect(getStripePublishableKey()).toBe('pk_test_placeholder')
  })

  it('returns the configured publishable key when present', async () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_real')

    const { getStripePublishableKey } = await import('@/lib/stripe/config')

    expect(getStripePublishableKey()).toBe('pk_test_real')
  })

  it('throws in production when the publishable key is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', '')

    const { getStripePublishableKey } = await import('@/lib/stripe/config')

    expect(() => getStripePublishableKey()).toThrow('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
  })

  it('computes the annual savings math from shared plan amounts', () => {
    expect(getPremiumAnnualSavings()).toEqual({
      monthlyEquivalentCents: 750,
      totalSavingsCents: 1800,
    })
  })

  it('formats whole-dollar and fractional dollar prices for billing copy', () => {
    expect(formatUsdFromCents(900)).toBe('$9')
    expect(formatUsdFromCents(9000)).toBe('$90')
    expect(formatUsdFromCents(750)).toBe('$7.50')
  })
})
