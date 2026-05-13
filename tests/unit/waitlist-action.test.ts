import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { captureEvent } from '@/lib/analytics'

const { fromMock, insertMock, getSupabaseAdminMock } = vi.hoisted(() => {
  const fromMock = vi.fn()
  const insertMock = vi.fn(() => ({ error: null as { code: string; message: string } | null }))
  const getSupabaseAdminMock = vi.fn(() => ({
    from: fromMock,
  }))
  fromMock.mockReturnValue({
    insert: insertMock,
  })
  return { fromMock, insertMock, getSupabaseAdminMock }
})

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn((key: string) => (key === 'x-forwarded-for' ? '127.0.0.1' : null)),
    }),
  ),
}))

// Mock rate-limit-public
vi.mock('@/lib/rate-limit-public', () => ({
  getClientIp: vi.fn(() => Promise.resolve('127.0.0.1')),
  limitAuthRequest: vi.fn(() => Promise.resolve({ success: true, limit: 5, remaining: 4, reset: Date.now() + 900000 })),
}))

// Mock disposable-email
vi.mock('@/lib/utils/disposable-email', () => ({
  isDisposableEmail: vi.fn((email: string) => email.includes('tempmail')),
}))

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(() => Promise.resolve()),
}))

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  })),
}))

// Mock resend
const sendMock = vi.fn()
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

// Mock supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}))

import { joinWaitlist } from '@/lib/actions/waitlist'

describe('joinWaitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RESEND_API_KEY = 'test-key'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://barterkin.com'
  })

  afterEach(() => {
    delete process.env.RESEND_API_KEY
    delete process.env.NEXT_PUBLIC_SITE_URL
  })

  it('accepts a valid email and returns ok', async () => {
    const formData = new FormData()
    formData.append('email', 'test@example.com')

    const result = await joinWaitlist(null, formData)

    expect(result.ok).toBe(true)
    expect(result.alreadyJoined).toBeUndefined()
  })

  it('accepts a blank county and stores null county_id', async () => {
    const formData = new FormData()
    formData.append('email', 'blank-county@example.com')
    formData.append('countyId', '')

    const result = await joinWaitlist(null, formData)

    expect(result.ok).toBe(true)
    expect(insertMock).toHaveBeenCalledWith({
      email: 'blank-county@example.com',
      county_id: null,
      source: 'hero_cta',
    })
  })

  it('stores county attribution and forwards it to analytics', async () => {
    const formData = new FormData()
    formData.append('email', 'county@example.com')
    formData.append('countyId', '13057')

    const result = await joinWaitlist(null, formData)

    expect(result.ok).toBe(true)
    expect(insertMock).toHaveBeenCalledWith({
      email: 'county@example.com',
      county_id: 13057,
      source: 'hero_cta',
    })
    expect(vi.mocked(captureEvent)).toHaveBeenCalledWith(
      'county@example.com',
      'waitlist_joined',
      {
        source: 'hero_cta',
        county_id: 13057,
      },
    )
  })

  it('rejects an invalid email', async () => {
    const formData = new FormData()
    formData.append('email', 'not-an-email')

    const result = await joinWaitlist(null, formData)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('valid email')
  })

  it('rejects a disposable email', async () => {
    const formData = new FormData()
    formData.append('email', 'user@tempmail.com')

    const result = await joinWaitlist(null, formData)

    expect(result.ok).toBe(false)
    expect(result.error).toContain("isn't supported")
  })

  it('handles duplicate email gracefully (alreadyJoined)', async () => {
    insertMock.mockReturnValueOnce({ error: { code: '23505', message: 'duplicate' } })

    const formData = new FormData()
    formData.append('email', 'existing@example.com')

    const result = await joinWaitlist(null, formData)

    expect(result.ok).toBe(true)
    expect(result.alreadyJoined).toBe(true)
  })

  it('returns an inline error when the admin client is unavailable', async () => {
    getSupabaseAdminMock.mockImplementationOnce(() => {
      throw new Error('missing service role key')
    })

    const formData = new FormData()
    formData.append('email', 'broken@example.com')

    const result = await joinWaitlist(null, formData)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Something went wrong')
  })

  it('sends a confirmation email when RESEND_API_KEY is set', async () => {
    sendMock.mockResolvedValueOnce({ data: { id: 'resend-xyz' }, error: null })

    const formData = new FormData()
    formData.append('email', 'new@example.com')

    await joinWaitlist(null, formData)

    expect(sendMock).toHaveBeenCalledOnce()
    const call = sendMock.mock.calls[0][0]
    expect(call.to).toEqual(['new@example.com'])
    expect(call.subject).toContain("waitlist")
    expect(call.html).toContain("Barterkin")
  })

  it('does not fail if email send fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend down'))

    const formData = new FormData()
    formData.append('email', 'fail@example.com')

    const result = await joinWaitlist(null, formData)

    expect(result.ok).toBe(true)
  })

  it('returns ok but skips email when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY

    const formData = new FormData()
    formData.append('email', 'nokey@example.com')

    const result = await joinWaitlist(null, formData)

    expect(result.ok).toBe(true)
    expect(sendMock).not.toHaveBeenCalled()
  })
})
