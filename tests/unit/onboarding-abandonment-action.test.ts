import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockSendEmail,
  mockRpc,
  mockGetSupabaseAdmin,
  mockGetOnboardingAbandonmentRecipients,
  mockRecordOnboardingReminderSent,
  mockCaptureEvent,
} = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
  mockRpc: vi.fn(),
  mockGetSupabaseAdmin: vi.fn(() => ({
    rpc: mockRpc,
  })),
  mockGetOnboardingAbandonmentRecipients: vi.fn(),
  mockRecordOnboardingReminderSent: vi.fn(),
  mockCaptureEvent: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: mockSendEmail }
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: mockGetSupabaseAdmin,
}))

vi.mock('@/lib/data/onboarding-abandonment', () => ({
  getOnboardingAbandonmentRecipients: mockGetOnboardingAbandonmentRecipients,
  recordOnboardingReminderSent: mockRecordOnboardingReminderSent,
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

import { sendOnboardingAbandonmentEmails } from '@/lib/actions/onboarding-abandonment'

describe('sendOnboardingAbandonmentEmails', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetSupabaseAdmin.mockImplementation(() => ({
      rpc: mockRpc,
    }))
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://barterkin.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns error when RESEND_API_KEY is missing', async () => {
    vi.unstubAllEnvs()

    const result = await sendOnboardingAbandonmentEmails()

    expect(result.ok).toBe(false)
    expect(result.error).toBe('RESEND_API_KEY not configured')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns ok with zeros when no recipients', async () => {
    mockGetOnboardingAbandonmentRecipients.mockResolvedValue({
      recipients: [],
      error: null,
    })

    const result = await sendOnboardingAbandonmentEmails()

    expect(result.ok).toBe(true)
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(0)
    expect(result.skipped).toBe(0)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns error when recipient fetch fails', async () => {
    mockGetOnboardingAbandonmentRecipients.mockResolvedValue({
      recipients: [],
      error: 'fetch_failed',
    })

    const result = await sendOnboardingAbandonmentEmails()

    expect(result.ok).toBe(false)
    expect(result.error).toBe('fetch_failed')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('sends email, records it, and tracks the event', async () => {
    mockGetOnboardingAbandonmentRecipients.mockResolvedValue({
      recipients: [
        {
          id: 'profile-1',
          display_name: 'Alice',
          username: 'alice',
          owner_id: 'owner-1',
          created_at: '2026-05-15T12:00:00.000Z',
        },
      ],
      error: null,
    })
    mockRpc.mockResolvedValue({ data: 'alice@example.com', error: null })
    mockRecordOnboardingReminderSent.mockResolvedValue({ ok: true })
    mockSendEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const result = await sendOnboardingAbandonmentEmails()

    expect(result.ok).toBe(true)
    expect(result.sent).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.skipped).toBe(0)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockRecordOnboardingReminderSent).toHaveBeenCalledWith('profile-1')
    expect(mockCaptureEvent).toHaveBeenCalledWith('owner-1', 'onboarding_abandonment_email_sent', {
      method: 'resend',
    })
  })

  it('skips recipients with no email', async () => {
    mockGetOnboardingAbandonmentRecipients.mockResolvedValue({
      recipients: [
        {
          id: 'profile-1',
          display_name: 'Alice',
          username: 'alice',
          owner_id: 'owner-1',
          created_at: '2026-05-15T12:00:00.000Z',
        },
      ],
      error: null,
    })
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await sendOnboardingAbandonmentEmails()

    expect(result.ok).toBe(true)
    expect(result.sent).toBe(0)
    expect(result.skipped).toBe(1)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('counts as failed when email lookup errors', async () => {
    mockGetOnboardingAbandonmentRecipients.mockResolvedValue({
      recipients: [
        {
          id: 'profile-1',
          display_name: 'Alice',
          username: 'alice',
          owner_id: 'owner-1',
          created_at: '2026-05-15T12:00:00.000Z',
        },
      ],
      error: null,
    })
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc error' } })

    const result = await sendOnboardingAbandonmentEmails()

    expect(result.ok).toBe(true)
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(1)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('counts as failed when record send fails after delivery', async () => {
    mockGetOnboardingAbandonmentRecipients.mockResolvedValue({
      recipients: [
        {
          id: 'profile-1',
          display_name: 'Alice',
          username: 'alice',
          owner_id: 'owner-1',
          created_at: '2026-05-15T12:00:00.000Z',
        },
      ],
      error: null,
    })
    mockRpc.mockResolvedValue({ data: 'alice@example.com', error: null })
    mockRecordOnboardingReminderSent.mockResolvedValue({ ok: false, error: 'db_error' })
    mockSendEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const result = await sendOnboardingAbandonmentEmails()

    expect(result.ok).toBe(true)
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(1)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockRecordOnboardingReminderSent).toHaveBeenCalledWith('profile-1')
  })

  it('returns error when Resend throws', async () => {
    mockGetOnboardingAbandonmentRecipients.mockResolvedValue({
      recipients: [
        {
          id: 'profile-1',
          display_name: 'Alice',
          username: 'alice',
          owner_id: 'owner-1',
          created_at: '2026-05-15T12:00:00.000Z',
        },
      ],
      error: null,
    })
    mockRpc.mockResolvedValue({ data: 'alice@example.com', error: null })
    mockSendEmail.mockRejectedValue(new Error('Resend down'))

    const result = await sendOnboardingAbandonmentEmails()

    expect(result.ok).toBe(true)
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(1)
    expect(mockRecordOnboardingReminderSent).not.toHaveBeenCalled()
  })
})
