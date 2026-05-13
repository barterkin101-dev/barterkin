import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Top-level mock function declarations (before vi.mock) ──
const mockSendEmail = vi.fn()
const mockFrom = vi.fn()

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: mockSendEmail }
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: mockFrom,
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

import { POST } from '@/app/api/cron/notify-waitlist/route'
import { captureEvent } from '@/lib/analytics'

describe('POST /api/cron/notify-waitlist', () => {
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
    return new Request('https://barterkin.com/api/cron/notify-waitlist', {
      method: 'POST',
      headers: authHeader ? { authorization: authHeader } : {},
    })
  }

  it('returns 401 when CRON_SECRET is set but header is missing', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when CRON_SECRET does not match', async () => {
    const res = await POST(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns 500 when RESEND_API_KEY is missing', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('CRON_SECRET', 'test-cron-secret')
    // No RESEND_API_KEY

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('RESEND_API_KEY not configured')
  })

  it('skips when no founding slots are available', async () => {
    // 100 founding members = 0 slots remaining
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ count: 100, error: null }),
          }),
        }
      }
      return {}
    })

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.notified).toBe(0)
    expect(body.reason).toBe('no_slots_available')
    expect(body.slots_remaining).toBe(0)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('skips when no unnotified waitlisters exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ count: 50, error: null }),
          }),
        }
      }
      if (table === 'waitlist') {
        return {
          select: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.notified).toBe(0)
    expect(body.reason).toBe('no_waitlisters')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('sends emails and marks waitlisters as notified', async () => {
    const waitlisters = [
      { id: 'w1', email: 'alice@example.com', county_id: null },
      { id: 'w2', email: 'bob@example.com', county_id: 131 },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ count: 95, error: null }),
          }),
        }
      }
      if (table === 'waitlist') {
        return {
          select: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({ data: waitlisters, error: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ error: null }),
          }),
        }
      }
      return {}
    })

    mockSendEmail.mockResolvedValue({ id: 'email-id' })

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.processed).toBe(2)
    expect(body.sent).toHaveLength(2)
    expect(body.sent).toContain('w1')
    expect(body.sent).toContain('w2')
    expect(body.failed).toHaveLength(0)

    // Verify emails were sent
    expect(mockSendEmail).toHaveBeenCalledTimes(2)
    expect(mockSendEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: ['alice@example.com'],
        subject: expect.stringContaining('5 founding member slots left'),
      }),
    )

    // Verify captureEvent was called
    expect(captureEvent).toHaveBeenCalledWith('system', 'waitlist_founding_notified', {
      count: 2,
      slots_remaining: 5,
    })
  })

  it('handles email send failures gracefully', async () => {
    const waitlisters = [
      { id: 'w1', email: 'alice@example.com', county_id: null },
      { id: 'w2', email: 'bob@example.com', county_id: null },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ count: 90, error: null }),
          }),
        }
      }
      if (table === 'waitlist') {
        return {
          select: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({ data: waitlisters, error: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ error: null }),
          }),
        }
      }
      return {}
    })

    // First email succeeds, second fails
    mockSendEmail
      .mockResolvedValueOnce({ id: 'email-1' })
      .mockRejectedValueOnce(new Error('Resend rate limit'))

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.sent).toHaveLength(1)
    expect(body.sent).toContain('w1')
    expect(body.failed).toHaveLength(1)
    expect(body.failed).toContain('w2')
  })

  it('handles database error when counting founding members', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ count: null, error: { message: 'connection lost' } }),
          }),
        }
      }
      return {}
    })

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Database error')
  })
})
