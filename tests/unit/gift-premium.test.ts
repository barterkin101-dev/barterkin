/**
 * Gift Premium tests
 * Covers checkout gift flow, webhook handling, and redemption API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

process.env.STRIPE_SECRET_KEY = 'sk_test_xxx'
process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID = 'price_test_xxx'
process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID = 'price_annual_xxx'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_xxx'
process.env.NEXT_PUBLIC_SITE_URL = 'https://barterkin.com'

const mockStripeCustomersCreate = vi.fn()
const mockStripeCheckoutSessionsCreate = vi.fn()

vi.mock('stripe', () => ({
  default: class MockStripe {
    customers = { create: mockStripeCustomersCreate }
    checkout = { sessions: { create: mockStripeCheckoutSessionsCreate } }
  },
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

vi.mock('@/lib/actions/gift-premium', () => ({
  sendGiftPremiumEmail: vi.fn().mockResolvedValue({ ok: true }),
}))

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

function resetChain() {
  mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate, insert: mockInsert })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle, order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [] }) }) })
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }) })
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: { id: 'user-1', email: 'buyer@example.com' } }, error: null }),
        ),
      },
      from: mockFrom,
    }),
  ),
}))

import { POST as checkoutPOST } from '@/app/api/stripe/checkout-session/route'
import { POST as redeemPOST } from '@/app/api/gift/redeem/route'

function makeCheckoutRequest(body?: Record<string, unknown>): NextRequest {
  return new NextRequest('https://barterkin.com/api/stripe/checkout-session', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'content-type': 'application/json' },
  })
}

function makeRedeemRequest(body?: Record<string, unknown>): NextRequest {
  return new NextRequest('https://barterkin.com/api/gift/redeem', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'content-type': 'application/json' },
  })
}

describe('gift premium flow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    resetChain()
  })

  describe('POST /api/stripe/checkout-session (gift)', () => {
    it('returns 400 when gift=true but no recipientEmail', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', display_name: 'Buyer', stripe_customer_id: null, tier: 'free' },
        error: null,
      })

      const res = await checkoutPOST(makeCheckoutRequest({ priceId: 'premium', gift: true }))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ ok: false, error: 'Recipient email is required for gift purchases.' })
    })

    it('creates gift checkout session with recipient email', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', display_name: 'Buyer', stripe_customer_id: null, tier: 'free' },
        error: null,
      })

      mockStripeCustomersCreate.mockResolvedValueOnce({ id: 'cus_new' })
      mockStripeCheckoutSessionsCreate.mockResolvedValueOnce({
        id: 'sess_gift_1',
        url: 'https://checkout.stripe.com/gift',
      })

      const res = await checkoutPOST(
        makeCheckoutRequest({ priceId: 'annual', gift: true, recipientEmail: 'friend@example.com' }),
      )
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.ok).toBe(true)
      expect(json.url).toBe('https://checkout.stripe.com/gift')
      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'https://barterkin.com/dashboard/billing?gift=success',
          metadata: expect.objectContaining({
            gift: 'true',
            recipient_email: 'friend@example.com',
            tier: 'premium',
            billing_interval: 'annual',
          }),
        }),
      )
      expect(mockInsert).toHaveBeenCalled()
    })

    it('creates gift_purchase record during checkout', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'prof-1', display_name: 'Buyer', stripe_customer_id: null, tier: 'free' },
        error: null,
      })

      mockStripeCustomersCreate.mockResolvedValueOnce({ id: 'cus_new' })
      mockStripeCheckoutSessionsCreate.mockResolvedValueOnce({
        id: 'sess_gift_2',
        url: 'https://checkout.stripe.com/gift2',
      })

      await checkoutPOST(
        makeCheckoutRequest({ priceId: 'premium', gift: true, recipientEmail: 'gift@example.com' }),
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaser_id: 'prof-1',
          recipient_email: 'gift@example.com',
          status: 'pending',
          tier: 'premium',
          billing_interval: 'monthly',
        }),
      )
    })
  })

  describe('POST /api/gift/redeem', () => {
    it('returns 401 when not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: new Error('auth') })),
        },
        from: mockFrom,
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      const res = await redeemPOST(makeRedeemRequest({ token: 'gift-123' }))
      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ ok: false, error: 'Not authenticated.' })
    })

    it('returns 404 when gift not found', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }) // gift lookup

      const res = await redeemPOST(makeRedeemRequest({ token: 'nonexistent' }))
      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ ok: false, error: 'Gift not found.' })
    })

    it('returns 409 when gift already redeemed', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({
          data: { id: 'gift-1', recipient_email: 'a@b.com', status: 'redeemed', tier: 'premium', billing_interval: 'monthly', stripe_subscription_id: 'sub_1' },
          error: null,
        }) // gift lookup
        .mockResolvedValueOnce({
          data: { id: 'prof-2', tier: 'free' },
          error: null,
        }) // profile lookup

      const res = await redeemPOST(makeRedeemRequest({ token: 'gift-1' }))
      expect(res.status).toBe(409)
      expect(await res.json()).toEqual({ ok: false, error: 'This gift has already been redeemed.' })
    })

    it('returns 409 when recipient already has premium', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({
          data: { id: 'gift-1', recipient_email: 'a@b.com', status: 'pending', tier: 'premium', billing_interval: 'monthly', stripe_subscription_id: 'sub_1' },
          error: null,
        }) // gift lookup
        .mockResolvedValueOnce({
          data: { id: 'prof-2', tier: 'premium' },
          error: null,
        }) // profile lookup

      const res = await redeemPOST(makeRedeemRequest({ token: 'gift-1' }))
      expect(res.status).toBe(409)
      expect(await res.json()).toEqual({ ok: false, error: 'You already have an active Premium subscription.' })
    })

    it('redeems gift successfully for free user', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({
          data: { id: 'gift-1', purchaser_id: 'prof-buyer', recipient_email: 'a@b.com', status: 'pending', tier: 'premium', billing_interval: 'annual', stripe_subscription_id: 'sub_1' },
          error: null,
        }) // gift lookup
        .mockResolvedValueOnce({
          data: { id: 'prof-2', tier: 'free' },
          error: null,
        }) // profile lookup

      const mockUpdateGift = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      const mockUpdateProfile = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

      mockFrom
        .mockReturnValueOnce({ select: mockSelect, update: mockUpdateGift })
        .mockReturnValueOnce({ select: mockSelect, update: mockUpdateProfile })

      const res = await redeemPOST(makeRedeemRequest({ token: 'gift-1' }))
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.ok).toBe(true)
      expect(json.tier).toBe('premium')
    })

    it('returns 400 when token is missing', async () => {
      const res = await redeemPOST(makeRedeemRequest({}))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ ok: false, error: 'Gift token is required.' })
    })
  })
})
