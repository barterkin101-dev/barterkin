import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockSendEmail,
  mockRpc,
  mockGetSupabaseAdmin,
  mockGetWelcomeEmailRecipient,
  mockRecordWelcomeEmailSent,
  mockCaptureEvent,
} = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
  mockRpc: vi.fn(),
  mockGetSupabaseAdmin: vi.fn(() => ({
    rpc: mockRpc,
  })),
  mockGetWelcomeEmailRecipient: vi.fn(),
  mockRecordWelcomeEmailSent: vi.fn(),
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

vi.mock('@/lib/data/welcome-email', () => ({
  getWelcomeEmailRecipient: mockGetWelcomeEmailRecipient,
  recordWelcomeEmailSent: mockRecordWelcomeEmailSent,
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

import { sendWelcomeEmail } from '@/lib/actions/welcome-email'

describe('sendWelcomeEmail', () => {
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

    const result = await sendWelcomeEmail('user-1')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('RESEND_API_KEY not configured')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns ok when welcome email was already sent', async () => {
    mockGetWelcomeEmailRecipient.mockResolvedValue({
      recipient: null,
      error: 'already_sent',
    })

    const result = await sendWelcomeEmail('user-1')

    expect(result.ok).toBe(true)
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(mockRecordWelcomeEmailSent).not.toHaveBeenCalled()
  })

  it('returns error when recipient not found', async () => {
    mockGetWelcomeEmailRecipient.mockResolvedValue({
      recipient: null,
      error: 'profile_not_found',
    })

    const result = await sendWelcomeEmail('user-1')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('profile_not_found')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns error when email lookup fails', async () => {
    mockGetWelcomeEmailRecipient.mockResolvedValue({
      recipient: {
        id: 'profile-1',
        display_name: 'Alice',
        username: 'alice',
        owner_id: 'owner-1',
      },
      error: null,
    })
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await sendWelcomeEmail('user-1')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('no_email_found')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('sends welcome email, records it, and tracks the event', async () => {
    mockGetWelcomeEmailRecipient.mockResolvedValue({
      recipient: {
        id: 'profile-1',
        display_name: 'Alice',
        username: 'alice',
        owner_id: 'owner-1',
      },
      error: null,
    })
    mockRpc.mockResolvedValue({ data: 'alice@example.com', error: null })
    mockRecordWelcomeEmailSent.mockResolvedValue({ ok: true })
    mockSendEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const result = await sendWelcomeEmail('user-1')

    expect(result.ok).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['alice@example.com'],
        subject: "Welcome to Barterkin — Georgia's community skills exchange",
      }),
    )
    expect(mockRecordWelcomeEmailSent).toHaveBeenCalledWith('profile-1')
    expect(mockCaptureEvent).toHaveBeenCalledWith('user-1', 'welcome_email_sent', {
      method: 'resend',
    })
  })

  it('returns ok even when record send fails after delivery', async () => {
    mockGetWelcomeEmailRecipient.mockResolvedValue({
      recipient: {
        id: 'profile-1',
        display_name: 'Alice',
        username: 'alice',
        owner_id: 'owner-1',
      },
      error: null,
    })
    mockRpc.mockResolvedValue({ data: 'alice@example.com', error: null })
    mockRecordWelcomeEmailSent.mockResolvedValue({ ok: false, error: 'db_error' })
    mockSendEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const result = await sendWelcomeEmail('user-1')

    expect(result.ok).toBe(true)
    expect(mockSendEmail).toHaveBeenCalled()
    expect(mockRecordWelcomeEmailSent).toHaveBeenCalledWith('profile-1')
  })

  it('returns error when Resend throws', async () => {
    mockGetWelcomeEmailRecipient.mockResolvedValue({
      recipient: {
        id: 'profile-1',
        display_name: 'Alice',
        username: 'alice',
        owner_id: 'owner-1',
      },
      error: null,
    })
    mockRpc.mockResolvedValue({ data: 'alice@example.com', error: null })
    mockSendEmail.mockRejectedValue(new Error('Resend down'))

    const result = await sendWelcomeEmail('user-1')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Resend down')
    expect(mockRecordWelcomeEmailSent).not.toHaveBeenCalled()
  })
})
