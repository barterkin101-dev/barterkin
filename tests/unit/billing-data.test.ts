import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPremiumBillingInterval } from '@/lib/data/billing'
import { getStripe } from '@/lib/stripe/server'

vi.mock('@/lib/stripe/server', () => ({
  getStripe: vi.fn(),
}))

describe('getPremiumBillingInterval', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns monthly for monthly premium subscriptions', async () => {
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          items: {
            data: [
              {
                price: {
                  recurring: { interval: 'month' },
                },
              },
            ],
          },
        }),
      },
    } as never)

    await expect(getPremiumBillingInterval('premium', 'sub_monthly')).resolves.toBe('monthly')
  })

  it('returns annual for annual premium subscriptions', async () => {
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          items: {
            data: [
              {
                price: {
                  recurring: { interval: 'year' },
                },
              },
            ],
          },
        }),
      },
    } as never)

    await expect(getPremiumBillingInterval('premium', 'sub_annual')).resolves.toBe('annual')
  })

  it('skips Stripe when the member is not a premium subscriber', async () => {
    await expect(getPremiumBillingInterval('free', 'sub_any')).resolves.toBeNull()
    await expect(getPremiumBillingInterval('premium', null)).resolves.toBeNull()

    expect(getStripe).not.toHaveBeenCalled()
  })
})
