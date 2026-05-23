import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockSendEmail,
  mockRpc,
  mockGetNewListingDigestRecipients,
  mockGetNewListingDigestListingsForProfile,
  mockRecordNewListingDigestSent,
  mockCaptureEvent,
} = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
  mockRpc: vi.fn(),
  mockGetNewListingDigestRecipients: vi.fn(),
  mockGetNewListingDigestListingsForProfile: vi.fn(),
  mockRecordNewListingDigestSent: vi.fn(),
  mockCaptureEvent: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: mockSendEmail }
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    rpc: mockRpc,
  })),
}))

vi.mock('@/lib/data/new-listing-digest', () => ({
  getNewListingDigestRecipients: mockGetNewListingDigestRecipients,
  getNewListingDigestListingsForProfile: mockGetNewListingDigestListingsForProfile,
  recordNewListingDigestSent: mockRecordNewListingDigestSent,
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: mockCaptureEvent,
}))

vi.mock('@/lib/digest-unsubscribe', () => ({
  safeBuildUnsubscribeUrl: vi.fn((profileId, siteUrl) => `${siteUrl}/unsubscribe?id=${profileId}&token=test-token`),
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

import { POST } from '@/app/api/cron/new-listing-digest/route'

describe('POST /api/cron/new-listing-digest', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('CRON_SECRET', 'test-cron-secret')
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://barterkin.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  function makeRequest(authHeader?: string) {
    return new Request('https://barterkin.com/api/cron/new-listing-digest', {
      method: 'POST',
      headers: authHeader ? { authorization: authHeader } : {},
    })
  }

  it('returns 401 when CRON_SECRET is set but header is missing', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 500 when RESEND_API_KEY is missing', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('CRON_SECRET', 'test-cron-secret')

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({ error: 'RESEND_API_KEY not configured' })
  })

  it('returns no_recipients when there is nobody eligible', async () => {
    mockGetNewListingDigestRecipients.mockResolvedValue({ recipients: [], error: null })

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      processed: 0,
      reason: 'no_recipients',
    })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('sends digests, records them, and tracks the batch event', async () => {
    mockGetNewListingDigestRecipients.mockResolvedValue({
      recipients: [
        {
          id: 'profile-1',
          display_name: 'Alice',
          username: 'alice',
          county_id: 131,
          owner_id: 'owner-1',
          last_login_at: '2026-05-10T00:00:00.000Z',
        },
      ],
      error: null,
    })
    mockRpc.mockResolvedValue({ data: 'alice@example.com', error: null })
    mockGetNewListingDigestListingsForProfile.mockResolvedValue({
      listings: [
        {
          id: 'listing-1',
          profile_id: 'seller-1',
          title: 'Fresh eggs for cedar mulch',
          description: 'A dozen eggs available for trade this week.',
          category_id: 1,
          county_id: 131,
          condition: 'good',
          trade_terms: 'Open to tools',
          price_estimate: null,
          created_at: '2026-05-13T00:00:00.000Z',
          seller_display_name: 'Farmer June',
          seller_username: 'farmer-june',
          seller_avatar_url: null,
          category_name: 'Farm',
          county_name: 'Cobb County',
        },
      ],
      error: null,
    })
    mockRecordNewListingDigestSent.mockResolvedValue({ ok: true })
    mockSendEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const res = await POST(makeRequest('Bearer test-cron-secret'))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      processed: 1,
      sent: ['profile-1'],
      failed: [],
      skipped: [],
    })
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['alice@example.com'],
        subject: '1 new listing in your county',
      }),
    )
    expect(mockRecordNewListingDigestSent).toHaveBeenCalledWith('profile-1', 1)
    expect(mockCaptureEvent).toHaveBeenCalledWith('system', 'new_listing_digest_sent', {
      count: 1,
      listings_total: 1,
    })
  })

  it('skips recipients with no listings', async () => {
    mockGetNewListingDigestRecipients.mockResolvedValue({
      recipients: [
        {
          id: 'profile-1',
          display_name: 'Alice',
          username: 'alice',
          county_id: 131,
          owner_id: 'owner-1',
          last_login_at: '2026-05-10T00:00:00.000Z',
        },
      ],
      error: null,
    })
    mockRpc.mockResolvedValue({ data: 'alice@example.com', error: null })
    mockGetNewListingDigestListingsForProfile.mockResolvedValue({ listings: [], error: null })

    const res = await POST(makeRequest('Bearer test-cron-secret'))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      processed: 1,
      sent: [],
      failed: [],
      skipped: ['profile-1'],
    })
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(mockRecordNewListingDigestSent).not.toHaveBeenCalled()
  })

  it('marks recipients failed when email lookup or delivery fails', async () => {
    mockGetNewListingDigestRecipients.mockResolvedValue({
      recipients: [
        {
          id: 'profile-1',
          display_name: 'Alice',
          username: 'alice',
          county_id: 131,
          owner_id: 'owner-1',
          last_login_at: '2026-05-10T00:00:00.000Z',
        },
        {
          id: 'profile-2',
          display_name: 'Bob',
          username: 'bob',
          county_id: 131,
          owner_id: 'owner-2',
          last_login_at: '2026-05-08T00:00:00.000Z',
        },
      ],
      error: null,
    })
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'rpc down' } })
      .mockResolvedValueOnce({ data: 'bob@example.com', error: null })
    mockGetNewListingDigestListingsForProfile.mockResolvedValue({
      listings: [
        {
          id: 'listing-1',
          profile_id: 'seller-1',
          title: 'Wheelbarrow',
          description: 'Trade for plants',
          category_id: 1,
          county_id: 131,
          condition: 'used',
          trade_terms: null,
          price_estimate: null,
          created_at: '2026-05-13T00:00:00.000Z',
          seller_display_name: 'Seller',
          seller_username: 'seller',
          seller_avatar_url: null,
          category_name: 'Tools',
          county_name: 'Cobb County',
        },
      ],
      error: null,
    })
    mockSendEmail.mockRejectedValue(new Error('Resend down'))

    const res = await POST(makeRequest('Bearer test-cron-secret'))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      processed: 2,
      sent: [],
      failed: ['profile-1', 'profile-2'],
    })
  })
})
