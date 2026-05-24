import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'

process.env.STRIPE_SECRET_KEY = 'sk_test_xxx'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_xxx'

const mockConstructEvent = vi.fn()
const mockRetrieveSubscription = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn()
const mockFrom = vi.fn()

vi.mock('stripe', () => ({
  default: class MockStripe {
    webhooks = { constructEvent: mockConstructEvent }
    subscriptions = { retrieve: mockRetrieveSubscription }
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
    }),
  ),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  })),
}))

import { POST } from '@/app/api/stripe/webhook/route'

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUpdateEq.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockUpdateEq })
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate })
  })

  it('restores founding tier and billing interval from Stripe on payment recovery', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          subscription: 'sub_123',
        } as unknown as Stripe.Invoice,
      },
    } satisfies Partial<Stripe.Event>)

    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'prof_1', tier: 'free', billing_interval: null },
      error: null,
    })

    mockRetrieveSubscription.mockResolvedValueOnce({
      id: 'sub_123',
      status: 'active',
      metadata: { profile_id: 'prof_1', tier: 'founding' },
      items: {
        data: [
          {
            current_period_end: 1_800_000_000,
            price: { recurring: { interval: 'month' } as unknown as Stripe.Price.Recurring } as unknown as Stripe.Price,
          } as unknown as Stripe.SubscriptionItem,
        ],
      } as unknown as Stripe.ApiList<Stripe.SubscriptionItem>,
    } satisfies Partial<Stripe.Subscription>)

    const response = await POST(new Request('https://barterkin.com/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'stripe-signature': 'sig_test' },
    }) as never)

    expect(response.status).toBe(200)
    expect(mockRetrieveSubscription).toHaveBeenCalledWith('sub_123')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      tier: 'founding',
      billing_interval: 'monthly',
      stripe_subscription_id: 'sub_123',
      subscription_current_period_end: '2027-01-15T08:00:00.000Z',
    }))
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'prof_1')
  })

  it('sets lifetime tier and subscription_status on checkout.session.completed for lifetime payment', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_lifetime',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_lifetime',
          customer: 'cus_lifetime',
          subscription: null,
          metadata: {
            profile_id: 'prof_lifetime',
            tier: 'lifetime',
            billing_interval: '',
            gift: 'false',
            recipient_email: '',
          },
        } as unknown as Stripe.Checkout.Session,
      },
    } satisfies Partial<Stripe.Event>)

    const response = await POST(new Request('https://barterkin.com/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'stripe-signature': 'sig_test' },
    }) as never)

    expect(response.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      tier: 'lifetime',
      billing_interval: null,
      stripe_customer_id: 'cus_lifetime',
      stripe_subscription_id: null,
      subscription_status: 'lifetime',
    }))
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'prof_lifetime')
  })
})
