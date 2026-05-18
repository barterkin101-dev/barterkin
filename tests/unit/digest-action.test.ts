import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockSendEmail,
  mockRpc,
  mockFrom,
  mockCaptureEvent,
  mockGetDigestRecipients,
  mockGetDigestListingsForProfile,
  mockGetUnreadMessageCountForProfile,
  mockRecordDigestSent,
} = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  mockCaptureEvent: vi.fn(),
  mockGetDigestRecipients: vi.fn(),
  mockGetDigestListingsForProfile: vi.fn(),
  mockGetUnreadMessageCountForProfile: vi.fn(),
  mockRecordDigestSent: vi.fn(),
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

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

vi.mock('@/lib/data/digest', () => ({
  getDigestRecipients: mockGetDigestRecipients,
  getDigestListingsForProfile: mockGetDigestListingsForProfile,
  getUnreadMessageCountForProfile: mockGetUnreadMessageCountForProfile,
  recordDigestSent: mockRecordDigestSent,
}))

import { sendDigestToProfile, sendWeeklyDigests } from '@/lib/actions/digest'

describe('sendDigestToProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://barterkin.com')
    vi.stubEnv('DIGEST_UNSUBSCRIBE_SECRET', 'test-unsubscribe-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sends digest with listings and unread messages', async () => {
    mockGetDigestRecipients.mockResolvedValue({
      recipients: [
        {
          id: 'prof-1',
          display_name: 'Alice',
          username: 'alice',
          county_id: 131,
          owner_id: 'owner-1',
        },
      ],
      error: null,
    })
    mockGetDigestListingsForProfile.mockResolvedValue({
      listings: [
        {
          id: 'listing-1',
          profile_id: 'seller-1',
          title: 'Fresh eggs',
          description: 'A dozen eggs',
          category_id: 1,
          county_id: 131,
          condition: 'good',
          trade_terms: null,
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
    mockGetUnreadMessageCountForProfile.mockResolvedValue(3)
    mockRpc.mockResolvedValue({ data: 'alice@example.com', error: null })
    mockSendEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null })
    mockRecordDigestSent.mockResolvedValue({ ok: true })

    const result = await sendDigestToProfile('prof-1')

    expect(result.ok).toBe(true)
    expect(result.sent).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['alice@example.com'],
        subject: 'You have 3 unread messages — New listings in Cobb County this week',
      }),
    )
    expect(mockCaptureEvent).toHaveBeenCalledWith('prof-1', 'digest_email_sent', {
      listings_count: 1,
      unread_count: 3,
    })
  })

  it('skips when profile is not eligible', async () => {
    mockGetDigestRecipients.mockResolvedValue({
      recipients: [],
      error: null,
    })

    const result = await sendDigestToProfile('prof-1')

    expect(result.ok).toBe(true)
    expect(result.sent).toBe(false)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('skips when there are no listings and no unread messages', async () => {
    mockGetDigestRecipients.mockResolvedValue({
      recipients: [
        {
          id: 'prof-1',
          display_name: 'Alice',
          username: 'alice',
          county_id: 131,
          owner_id: 'owner-1',
        },
      ],
      error: null,
    })
    mockGetDigestListingsForProfile.mockResolvedValue({ listings: [], error: null })
    mockGetUnreadMessageCountForProfile.mockResolvedValue(0)

    const result = await sendDigestToProfile('prof-1')

    expect(result.ok).toBe(true)
    expect(result.sent).toBe(false)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns error when RESEND_API_KEY is missing', async () => {
    vi.unstubAllEnvs()

    const result = await sendDigestToProfile('prof-1')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('RESEND_API_KEY not configured')
  })

  it('returns error when email lookup fails', async () => {
    mockGetDigestRecipients.mockResolvedValue({
      recipients: [
        {
          id: 'prof-1',
          display_name: 'Alice',
          username: 'alice',
          county_id: 131,
          owner_id: 'owner-1',
        },
      ],
      error: null,
    })
    mockGetDigestListingsForProfile.mockResolvedValue({
      listings: [{ id: 'l1', title: 'Test', description: 'Desc', category_id: 1, county_id: 131, condition: null, trade_terms: null, price_estimate: null, created_at: '2026-05-13T00:00:00.000Z', seller_display_name: 'Seller', seller_username: 'seller', seller_avatar_url: null, category_name: 'General', county_name: 'Cobb', profile_id: 's1' }],
      error: null,
    })
    mockGetUnreadMessageCountForProfile.mockResolvedValue(0)
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc error' } })

    const result = await sendDigestToProfile('prof-1')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('email_lookup_failed')
  })
})

describe('sendWeeklyDigests', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
    vi.stubEnv('DIGEST_UNSUBSCRIBE_SECRET', 'test-unsubscribe-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('processes all recipients and returns aggregate stats', async () => {
    mockGetDigestRecipients.mockResolvedValue({
      recipients: [
        { id: 'prof-1', display_name: 'Alice', username: 'alice', county_id: 131, owner_id: 'owner-1' },
        { id: 'prof-2', display_name: 'Bob', username: 'bob', county_id: 132, owner_id: 'owner-2' },
      ],
      error: null,
    })

    mockGetDigestListingsForProfile
      .mockResolvedValueOnce({ listings: [{ id: 'l1', title: 'Test', description: 'Desc', category_id: 1, county_id: 131, condition: null, trade_terms: null, price_estimate: null, created_at: '2026-05-13T00:00:00.000Z', seller_display_name: 'Seller', seller_username: 'seller', seller_avatar_url: null, category_name: 'General', county_name: 'Cobb', profile_id: 's1' }], error: null })
      .mockResolvedValueOnce({ listings: [], error: null })

    mockGetUnreadMessageCountForProfile
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)

    mockRpc
      .mockResolvedValueOnce({ data: 'alice@example.com', error: null })
      .mockResolvedValueOnce({ data: 'bob@example.com', error: null })

    mockSendEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null })
    mockRecordDigestSent.mockResolvedValue({ ok: true })

    const result = await sendWeeklyDigests()

    expect(result.ok).toBe(true)
    expect(result.processed).toBe(2)
    expect(result.sent).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.failed).toBe(0)
  })

  it('returns error when recipient fetch fails', async () => {
    mockGetDigestRecipients.mockResolvedValue({
      recipients: [],
      error: 'database_error',
    })

    const result = await sendWeeklyDigests()

    expect(result.ok).toBe(false)
    expect(result.error).toBe('database_error')
  })
})
