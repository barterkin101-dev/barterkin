import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockSendEmail,
  mockGetAlertEligibleSearches,
  mockGetNewListingsForSavedSearch,
  mockRecordAlertSent,
  mockCaptureEvent,
  mockRpc,
  mockFrom,
  mockMaybeSingle,
} = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
  mockGetAlertEligibleSearches: vi.fn(),
  mockGetNewListingsForSavedSearch: vi.fn(),
  mockRecordAlertSent: vi.fn(),
  mockCaptureEvent: vi.fn(),
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  mockMaybeSingle: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: mockSendEmail }
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
  })),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: mockCaptureEvent,
}))

vi.mock('@/lib/data/saved-searches', () => ({
  getAlertEligibleSearches: mockGetAlertEligibleSearches,
  getNewListingsForSavedSearch: mockGetNewListingsForSavedSearch,
  recordAlertSent: mockRecordAlertSent,
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

vi.mock('@/lib/digest-unsubscribe', () => ({
  safeBuildUnsubscribeUrl: vi.fn(() => 'https://barterkin.com/unsubscribe?token=abc'),
}))

import { sendListingAlerts } from '@/lib/actions/listing-alerts'

describe('sendListingAlerts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://barterkin.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns error when RESEND_API_KEY is missing', async () => {
    vi.unstubAllEnvs()
    const result = await sendListingAlerts()
    expect(result.ok).toBe(false)
    expect(result.error).toBe('RESEND_API_KEY not configured')
  })

  it('returns error when eligible search fetch fails', async () => {
    mockGetAlertEligibleSearches.mockResolvedValue({ searches: [], error: 'fetch_failed' })
    const result = await sendListingAlerts()
    expect(result.ok).toBe(false)
    expect(result.error).toBe('fetch_failed')
  })

  it('sends alerts for searches with matching listings', async () => {
    mockGetAlertEligibleSearches.mockResolvedValue({
      searches: [
        {
          id: 'ss-1',
          profile_id: 'prof-1',
          query: 'eggs',
          category_id: null,
          county_id: null,
          email_alert_enabled: true,
          last_alert_sent_at: null,
          created_at: '2026-05-19T00:00:00.000Z',
          updated_at: '2026-05-19T00:00:00.000Z',
        },
      ],
      error: null,
    })

    mockGetNewListingsForSavedSearch.mockResolvedValue({
      listings: [
        {
          id: 'listing-1',
          title: 'Fresh eggs',
          description: 'A dozen fresh eggs',
          created_at: '2026-05-19T10:00:00.000Z',
          category_name: 'Farm',
          county_name: 'Cobb County',
          seller_display_name: 'Farmer June',
          seller_username: 'farmer-june',
        },
      ],
      error: null,
    })

    mockRpc.mockResolvedValue({ data: 'alice@example.com', error: null })
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
    })
    mockMaybeSingle.mockResolvedValue({ data: { display_name: 'Alice', username: 'alice' }, error: null })
    mockSendEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null })
    mockRecordAlertSent.mockResolvedValue({ ok: true })

    const result = await sendListingAlerts()
    expect(result.ok).toBe(true)
    expect(result.sent).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.skipped).toBe(0)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['alice@example.com'],
        subject: '1 new listing matches your search',
      }),
    )
    expect(mockCaptureEvent).toHaveBeenCalledWith('prof-1', 'listing_alert_sent', {
      saved_search_id: 'ss-1',
      listings_count: 1,
    })
  })

  it('skips searches with no matching listings', async () => {
    mockGetAlertEligibleSearches.mockResolvedValue({
      searches: [
        {
          id: 'ss-1',
          profile_id: 'prof-1',
          query: null,
          category_id: null,
          county_id: null,
          email_alert_enabled: true,
          last_alert_sent_at: null,
          created_at: '2026-05-19T00:00:00.000Z',
          updated_at: '2026-05-19T00:00:00.000Z',
        },
      ],
      error: null,
    })

    mockGetNewListingsForSavedSearch.mockResolvedValue({ listings: [], error: null })

    const result = await sendListingAlerts()
    expect(result.ok).toBe(true)
    expect(result.sent).toBe(0)
    expect(result.skipped).toBe(1)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('skips when email cannot be resolved', async () => {
    mockGetAlertEligibleSearches.mockResolvedValue({
      searches: [
        {
          id: 'ss-1',
          profile_id: 'prof-1',
          query: null,
          category_id: null,
          county_id: null,
          email_alert_enabled: true,
          last_alert_sent_at: null,
          created_at: '2026-05-19T00:00:00.000Z',
          updated_at: '2026-05-19T00:00:00.000Z',
        },
      ],
      error: null,
    })

    mockGetNewListingsForSavedSearch.mockResolvedValue({
      listings: [{ id: 'l-1', title: 'T', description: 'D', created_at: '2026-05-19T10:00:00.000Z', category_name: null, county_name: null, seller_display_name: null, seller_username: null }],
      error: null,
    })

    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await sendListingAlerts()
    expect(result.ok).toBe(true)
    expect(result.sent).toBe(0)
    expect(result.skipped).toBe(1)
  })

  it('counts failures when listing query errors', async () => {
    mockGetAlertEligibleSearches.mockResolvedValue({
      searches: [
        {
          id: 'ss-1',
          profile_id: 'prof-1',
          query: null,
          category_id: null,
          county_id: null,
          email_alert_enabled: true,
          last_alert_sent_at: null,
          created_at: '2026-05-19T00:00:00.000Z',
          updated_at: '2026-05-19T00:00:00.000Z',
        },
      ],
      error: null,
    })

    mockGetNewListingsForSavedSearch.mockResolvedValue({ listings: [], error: 'query_failed' })

    const result = await sendListingAlerts()
    expect(result.ok).toBe(true)
    expect(result.failed).toBe(1)
  })
})
