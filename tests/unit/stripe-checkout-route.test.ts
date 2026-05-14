import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.STRIPE_SECRET_KEY = 'sk_test_xxx'
process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID = 'price_test_xxx'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_xxx'
process.env.NEXT_PUBLIC_SITE_URL = 'https://barterkin.com'

const mockStripeCheckoutSessionsCreate = vi.fn()
const mockStripeCustomersCreate = vi.fn()
const mockFrom = vi.fn()
const mockAdminFrom = vi.fn()
const mockMaybeSingle = vi.fn()

vi.mock('stripe', () => ({
  default: class MockStripe {
    customers = { create: mockStripeCustomersCreate }
    checkout = { sessions: { create: mockStripeCheckoutSessionsCreate } }
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null }),
        ),
      },
      from: mockFrom,
    }),
  ),
}))

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

import { POST } from '@/app/api/stripe/checkout-session/route'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

describe('POST /api/stripe/checkout-session', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'profiles') {
        throw new Error(`Unexpected table: ${table}`)
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle,
          }),
        }),
      }
    })

    mockAdminFrom.mockImplementation((table: string) => {
      if (table !== 'profiles') {
        throw new Error(`Unexpected admin table: ${table}`)
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn(),
        }),
      }
    })
  })

  it('uses the admin client for founding slot counts and blocks sold-out founding checkout', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'prof-1', display_name: 'Test', stripe_customer_id: null, tier: 'free' },
      error: null,
    })

    const mockAdminEq = vi.fn().mockResolvedValueOnce({ count: 100, error: null })
    mockAdminFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: mockAdminEq,
      }),
    })

    const req = new Request('https://barterkin.com/api/stripe/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ priceId: 'founding' }),
    })

    const res = await POST(req as never)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toContain('sold out')
    expect(mockAdminFrom).toHaveBeenCalledWith('profiles')
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockStripeCustomersCreate).not.toHaveBeenCalled()
    expect(mockStripeCheckoutSessionsCreate).not.toHaveBeenCalled()
  })

  it('returns JSON 500 when founding checkout cannot initialize the admin client', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'prof-1', display_name: 'Test', stripe_customer_id: null, tier: 'free' },
      error: null,
    })

    vi.mocked(getSupabaseAdmin).mockImplementationOnce(() => {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
    })

    const req = new Request('https://barterkin.com/api/stripe/checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ priceId: 'founding' }),
    })

    const res = await POST(req as never)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toEqual({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY missing' })
    expect(mockStripeCustomersCreate).not.toHaveBeenCalled()
    expect(mockStripeCheckoutSessionsCreate).not.toHaveBeenCalled()
  })
})
