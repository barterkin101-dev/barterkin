/**
 * Billing API routes — unit tests
 * Tests /api/stripe/checkout-session and /api/stripe/customer-portal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Set env vars BEFORE any module imports that read them
process.env.STRIPE_SECRET_KEY = 'sk_test_xxx'
process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID = 'price_test_xxx'
process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID = 'price_annual_xxx'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_xxx'
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

// Import route handlers after mocks are set up
import { POST as checkoutPOST } from '@/app/api/stripe/checkout-session/route'
import { POST as portalPOST } from '@/app/api/stripe/customer-portal/route'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

function makeRequest(body?: Record<string, unknown>): NextRequest {
  return new NextRequest('https://barterkin.com/api/stripe/checkout-session', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'content-type': 'application/json' },
  })
}

describe('billing API routes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    resetChain()
  })

  describe('POST /api/stripe/checkout-session', () => {
    it('returns 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: new Error('auth') })),
        },
        from: mockFrom,
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      const res = await checkoutPOST(makeRequest())
      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ ok: false, error: 'Not authenticated.' })
    })

    it('returns 409 when already subscribed', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', display_name: 'Test', stripe_customer_id: 'cus_1', tier: 'premium' },
        error: null,
      })

      const res = await checkoutPOST(makeRequest())
      expect(res.status).toBe(409)
      expect(await res.json()).toEqual({ ok: false, error: 'Already subscribed.' })
    })

    it('creates checkout session for free user (premium default)', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', display_name: 'Test', stripe_customer_id: null, tier: 'free' },
        error: null,
      })

      mockStripeCustomersCreate.mockResolvedValueOnce({ id: 'cus_new' })
      mockStripeCheckoutSessionsCreate.mockResolvedValueOnce({
        id: 'sess_1',
        url: 'https://checkout.stripe.com/test',
      })

      const res = await checkoutPOST(makeRequest())
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.ok).toBe(true)
      expect(json.url).toBe('https://checkout.stripe.com/test')
      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'https://barterkin.com/dashboard/billing/success?tier=premium&billing=monthly',
          metadata: expect.objectContaining({
            tier: 'premium',
            billing_interval: 'monthly',
          }),
        }),
      )
      expect(mockStripeCustomersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          metadata: { profile_id: 'prof-1', user_id: 'user-1' },
        }),
      )
    })

    it('creates annual premium checkout when priceId=annual', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', display_name: 'Test', stripe_customer_id: null, tier: 'free' },
        error: null,
      })

      mockStripeCustomersCreate.mockResolvedValueOnce({ id: 'cus_new' })
      mockStripeCheckoutSessionsCreate.mockResolvedValueOnce({
        id: 'sess_annual',
        url: 'https://checkout.stripe.com/annual',
      })

      const res = await checkoutPOST(makeRequest({ priceId: 'annual' }))
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.ok).toBe(true)
      expect(json.url).toBe('https://checkout.stripe.com/annual')
      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: 'price_annual_xxx', quantity: 1 }],
          success_url: 'https://barterkin.com/dashboard/billing/success?tier=premium&billing=annual',
          metadata: expect.objectContaining({
            tier: 'premium',
            billing_interval: 'annual',
          }),
          subscription_data: expect.objectContaining({
            metadata: expect.objectContaining({
              tier: 'premium',
              billing_interval: 'annual',
            }),
          }),
        }),
      )
    })

    it('returns 503 when annual billing is requested without an annual Stripe price', async () => {
      const existingAnnual = process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID
      delete process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID

      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', display_name: 'Test', stripe_customer_id: null, tier: 'free' },
        error: null,
      })

      const res = await checkoutPOST(makeRequest({ priceId: 'annual' }))
      const json = await res.json()

      expect(res.status).toBe(503)
      expect(json).toEqual({ ok: false, error: 'Annual billing is not configured yet.' })
      expect(mockStripeCustomersCreate).not.toHaveBeenCalled()
      expect(mockStripeCheckoutSessionsCreate).not.toHaveBeenCalled()

      process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID = existingAnnual
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

      const res = await checkoutPOST(makeRequest())
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.ok).toBe(true)
      expect(mockStripeCustomersCreate).not.toHaveBeenCalled()
    })

    it('creates founding member checkout when priceId=founding and slots available', async () => {
      process.env.STRIPE_FOUNDING_MONTHLY_PRICE_ID = 'price_founding_xxx'

      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', display_name: 'Test', stripe_customer_id: null, tier: 'free' },
        error: null,
      })

      mockAdminEq.mockResolvedValueOnce({ count: 0, error: null })

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

      const res = await checkoutPOST(makeRequest({ priceId: 'founding' }))
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.ok).toBe(true)
      expect(getSupabaseAdmin).toHaveBeenCalledTimes(1)
      expect(mockAdminFrom).toHaveBeenCalledWith('profiles')
      expect(mockAdminSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true })
      expect(mockAdminEq).toHaveBeenCalledWith('tier', 'founding')
      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: 'price_founding_xxx', quantity: 1 }],
          success_url: 'https://barterkin.com/dashboard/billing/success?tier=founding&billing=monthly',
          metadata: expect.objectContaining({ tier: 'founding', billing_interval: 'monthly' }),
        }),
      )
    })

    it('rejects founding member checkout when slots are sold out', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', display_name: 'Test', stripe_customer_id: null, tier: 'free' },
        error: null,
      })

      mockAdminEq.mockResolvedValueOnce({ count: 100, error: null })

      const res = await checkoutPOST(makeRequest({ priceId: 'founding' }))
      const json = await res.json()

      expect(res.status).toBe(409)
      expect(json.ok).toBe(false)
      expect(json.error).toContain('sold out')
      expect(getSupabaseAdmin).toHaveBeenCalledTimes(1)
      expect(mockAdminFrom).toHaveBeenCalledWith('profiles')
      expect(mockAdminSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true })
      expect(mockAdminEq).toHaveBeenCalledWith('tier', 'founding')
      expect(mockStripeCustomersCreate).not.toHaveBeenCalled()
      expect(mockStripeCheckoutSessionsCreate).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/stripe/customer-portal', () => {
    it('returns 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: new Error('auth') })),
        },
        from: mockFrom,
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      const res = await portalPOST()
      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ ok: false, error: 'Not authenticated.' })
    })

    it('returns 404 when no stripe customer', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', stripe_customer_id: null },
        error: null,
      })

      const res = await portalPOST()
      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ ok: false, error: 'No billing account found.' })
    })

    it('creates portal session for existing customer', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', stripe_customer_id: 'cus_1' },
        error: null,
      })

      mockStripeBillingPortalSessionsCreate.mockResolvedValueOnce({
        url: 'https://billing.stripe.com/test',
      })

      const res = await portalPOST()
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.ok).toBe(true)
      expect(json.url).toBe('https://billing.stripe.com/test')
    })
  })
})
