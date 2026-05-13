/**
 * Billing server actions — unit tests
 * Tests createCheckoutSession, createCustomerPortalSession, and tier gating.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Set env vars BEFORE any module imports that read them
process.env.STRIPE_SECRET_KEY = 'sk_test_xxx'
process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID = 'price_test_xxx'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_xxx'
process.env.NEXT_PUBLIC_SITE_URL = 'https://barterkin.com'

// Mock Stripe before importing modules that use it
const mockStripeCustomersCreate = vi.fn()
const mockStripeCheckoutSessionsCreate = vi.fn()
const mockStripeBillingPortalSessionsCreate = vi.fn()

vi.mock('stripe', () => ({
  default: class MockStripe {
    customers = { create: mockStripeCustomersCreate }
    checkout = { sessions: { create: mockStripeCheckoutSessionsCreate } }
    billingPortal = { sessions: { create: mockStripeBillingPortalSessionsCreate } }
  },
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

const mockAdminFrom = vi.fn()
const mockAdminSelect = vi.fn()
const mockAdminEq = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}))

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpdate = vi.fn()

function resetChain() {
  mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle })
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  mockAdminFrom.mockReturnValue({ select: mockAdminSelect })
  mockAdminSelect.mockReturnValue({ eq: mockAdminEq })
  mockAdminEq.mockReturnValue({ count: 0, error: null })
}

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

// Now import the billing actions after mocks are set up
import { createCheckoutSession, createCustomerPortalSession } from '@/lib/actions/billing'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

describe('billing actions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    resetChain()
  })

  afterEach(() => {
    // Keep env vars set for subsequent tests
  })

  describe('createCheckoutSession', () => {
    it('returns error when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: new Error('auth') })),
        },
        from: mockFrom,
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      const result = await createCheckoutSession(null, new FormData())
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Not authenticated.')
    })

    it('returns error when already subscribed', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', display_name: 'Test', stripe_customer_id: 'cus_1', tier: 'premium' },
        error: null,
      })

      const result = await createCheckoutSession(null, new FormData())
      expect(result.ok).toBe(false)
      expect(result.error).toContain('already have an active subscription')
    })

    it('creates checkout session for free user', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', display_name: 'Test', stripe_customer_id: null, tier: 'free' },
        error: null,
      })

      mockStripeCustomersCreate.mockResolvedValueOnce({ id: 'cus_new' })
      mockStripeCheckoutSessionsCreate.mockResolvedValueOnce({
        id: 'sess_1',
        url: 'https://checkout.stripe.com/test',
      })

      const fd = new FormData()
      const result = await createCheckoutSession(null, fd)

      expect(result.ok).toBe(true)
      expect(result.url).toBe('https://checkout.stripe.com/test')
      expect(mockStripeCustomersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          metadata: { profile_id: 'prof-1', user_id: 'user-1' },
        }),
      )
    })

    it('reuses existing stripe customer', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', display_name: 'Test', stripe_customer_id: 'cus_existing', tier: 'free' },
        error: null,
      })

      mockStripeCheckoutSessionsCreate.mockResolvedValueOnce({
        id: 'sess_1',
        url: 'https://checkout.stripe.com/test',
      })

      const fd = new FormData()
      const result = await createCheckoutSession(null, fd)

      expect(result.ok).toBe(true)
      expect(mockStripeCustomersCreate).not.toHaveBeenCalled()
    })

    it('creates founding member checkout when plan=founding and slots available', async () => {
      process.env.STRIPE_FOUNDING_MONTHLY_PRICE_ID = 'price_founding_xxx'

      // First call: profile lookup (select->eq->maybeSingle)
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', display_name: 'Test', stripe_customer_id: null, tier: 'free' },
        error: null,
      })

      // Admin client: founding member count (select with count->eq returns {count,error})
      mockAdminEq.mockResolvedValueOnce({ count: 0, error: null })

      // Second call (regular client): update stripe_customer_id (update->eq)
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate2 = vi.fn().mockReturnValue({ eq: mockUpdateEq })

      mockFrom
        .mockReturnValueOnce({ select: mockSelect, update: mockUpdate2 })
        .mockReturnValueOnce({ select: mockSelect, update: mockUpdate2 })

      mockStripeCustomersCreate.mockResolvedValueOnce({ id: 'cus_new' })
      mockStripeCheckoutSessionsCreate.mockResolvedValueOnce({
        id: 'sess_1',
        url: 'https://checkout.stripe.com/test',
      })

      const fd = new FormData()
      fd.append('plan', 'founding')
      const result = await createCheckoutSession(null, fd)

      expect(result.ok).toBe(true)
      expect(getSupabaseAdmin).toHaveBeenCalledTimes(1)
      expect(mockAdminFrom).toHaveBeenCalledWith('profiles')
      expect(mockAdminSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true })
      expect(mockAdminEq).toHaveBeenCalledWith('tier', 'founding')
      expect(mockFrom).toHaveBeenCalledTimes(2)
      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: 'price_founding_xxx', quantity: 1 }],
          metadata: expect.objectContaining({ tier: 'founding' }),
        }),
      )
    })

    it('rejects founding member checkout when slots are sold out', async () => {
      // First call: profile lookup
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', display_name: 'Test', stripe_customer_id: null, tier: 'free' },
        error: null,
      })

      // Admin client: founding member count — sold out
      mockAdminEq.mockResolvedValueOnce({ count: 100, error: null })

      const fd = new FormData()
      fd.append('plan', 'founding')
      const result = await createCheckoutSession(null, fd)

      expect(result.ok).toBe(false)
      expect(result.error).toContain('sold out')
      expect(getSupabaseAdmin).toHaveBeenCalledTimes(1)
      expect(mockAdminFrom).toHaveBeenCalledWith('profiles')
      expect(mockAdminSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true })
      expect(mockAdminEq).toHaveBeenCalledWith('tier', 'founding')
      expect(mockStripeCustomersCreate).not.toHaveBeenCalled()
      expect(mockStripeCheckoutSessionsCreate).not.toHaveBeenCalled()
    })
  })

  describe('createCustomerPortalSession', () => {
    it('returns error when no stripe customer', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', stripe_customer_id: null },
        error: null,
      })

      const result = await createCustomerPortalSession(null)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('No billing account')
    })

    it('creates portal session for existing customer', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', stripe_customer_id: 'cus_1' },
        error: null,
      })

      mockStripeBillingPortalSessionsCreate.mockResolvedValueOnce({
        url: 'https://billing.stripe.com/test',
      })

      const result = await createCustomerPortalSession(null)
      expect(result.ok).toBe(true)
      expect(result.url).toBe('https://billing.stripe.com/test')
    })
  })
})
