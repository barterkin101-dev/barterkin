import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendListingSaveNotifications } from '@/lib/actions/listing-save-notifications'

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = {
      send: vi.fn().mockResolvedValue({ id: 'email-1' }),
    }
  },
}))

const mockGetPending = vi.fn()
const mockRecordSent = vi.fn()
const mockRecordFailed = vi.fn()

vi.mock('@/lib/data/listing-save-notifications', () => ({
  getPendingListingSaveNotifications: (...args: unknown[]) => mockGetPending(...args),
  recordListingSaveNotificationSent: (...args: unknown[]) => mockRecordSent(...args),
  recordListingSaveNotificationFailed: (...args: unknown[]) => mockRecordFailed(...args),
}))

describe('sendListingSaveNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRecordSent.mockResolvedValue({ ok: true })
    mockRecordFailed.mockResolvedValue({ ok: true })
    process.env.RESEND_API_KEY = 'test-api-key'
  })

  it('returns early when no pending notifications', async () => {
    mockGetPending.mockResolvedValue({ notifications: [], error: null })

    const result = await sendListingSaveNotifications()
    expect(result.ok).toBe(true)
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(0)
    expect(result.skipped).toBe(0)
  })

  it('sends notification and records success', async () => {
    mockGetPending.mockResolvedValue({
      notifications: [
        {
          notification: { id: 'notif-1' },
          seller: { id: 'seller-1', display_name: 'Alice', username: 'alice', owner_id: 'owner-1' },
          listing: { id: 'listing-1', title: 'Vintage Camera' },
          saver: { id: 'saver-1', display_name: 'Bob', username: 'bob' },
        },
      ],
      error: null,
    })
    mockRpc.mockResolvedValue({ data: 'alice@example.com', error: null })

    const result = await sendListingSaveNotifications()
    expect(result.ok).toBe(true)
    expect(result.sent).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.skipped).toBe(0)
    expect(mockRecordSent).toHaveBeenCalledWith('notif-1')
  })

  it('skips when no email found', async () => {
    mockGetPending.mockResolvedValue({
      notifications: [
        {
          notification: { id: 'notif-1' },
          seller: { id: 'seller-1', display_name: 'Alice', username: 'alice', owner_id: 'owner-1' },
          listing: { id: 'listing-1', title: 'Vintage Camera' },
          saver: { id: 'saver-1', display_name: 'Bob', username: 'bob' },
        },
      ],
      error: null,
    })
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await sendListingSaveNotifications()
    expect(result.ok).toBe(true)
    expect(result.sent).toBe(0)
    expect(result.skipped).toBe(1)
    expect(mockRecordFailed).toHaveBeenCalledWith('notif-1', 'No email found for seller')
  })
})
