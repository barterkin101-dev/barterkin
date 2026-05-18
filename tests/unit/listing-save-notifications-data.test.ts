import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getPendingListingSaveNotifications,
  recordListingSaveNotificationSent,
  recordListingSaveNotificationFailed,
} from '@/lib/data/listing-save-notifications'

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockUpdate = vi.fn()
const mockFrom = vi.fn()
const mockIn = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: mockFrom,
  })),
}))

describe('getPendingListingSaveNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({
      select: mockSelect,
    })
    mockSelect.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      order: mockOrder,
    })
    mockOrder.mockReturnValue({
      limit: mockLimit,
    })
    mockLimit.mockResolvedValue({ data: [], error: null })
  })

  it('returns empty array when no pending notifications', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null })

    const result = await getPendingListingSaveNotifications()
    expect(result.notifications).toEqual([])
    expect(result.error).toBeNull()
  })

  it('returns notifications with seller, listing, and saver data', async () => {
    const pending = [
      {
        id: 'notif-1',
        saved_listing_id: 'sl-1',
        listing_id: 'listing-1',
        saver_profile_id: 'saver-1',
        seller_profile_id: 'seller-1',
        created_at: '2026-05-18T12:00:00.000Z',
      },
    ]

    mockLimit.mockResolvedValue({ data: pending, error: null })

    // Seller profiles
    const mockSellerSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: [
          { id: 'seller-1', display_name: 'Alice', username: 'alice', owner_id: 'owner-1' },
        ],
        error: null,
      }),
    })

    // Listings
    const mockListingSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: [{ id: 'listing-1', title: 'Vintage Camera' }],
        error: null,
      }),
    })

    // Savers
    const mockSaverSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: [{ id: 'saver-1', display_name: 'Bob', username: 'bob' }],
        error: null,
      }),
    })

    mockFrom
      .mockReturnValueOnce({ select: mockSelect })
      .mockReturnValueOnce({ select: mockSellerSelect })
      .mockReturnValueOnce({ select: mockListingSelect })
      .mockReturnValueOnce({ select: mockSaverSelect })

    const result = await getPendingListingSaveNotifications()

    expect(result.notifications).toHaveLength(1)
    expect(result.notifications[0].seller.display_name).toBe('Alice')
    expect(result.notifications[0].listing.title).toBe('Vintage Camera')
    expect(result.notifications[0].saver.display_name).toBe('Bob')
    expect(result.error).toBeNull()
  })

  it('returns error when fetch fails', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await getPendingListingSaveNotifications()
    expect(result.notifications).toEqual([])
    expect(result.error).toBe('fetch_failed')
  })
})

describe('recordListingSaveNotificationSent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({
      update: mockUpdate,
    })
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
  })

  it('records sent status', async () => {
    const result = await recordListingSaveNotificationSent('notif-1')
    expect(result.ok).toBe(true)
  })

  it('returns error on failure', async () => {
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
    })

    const result = await recordListingSaveNotificationSent('notif-1')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Update failed')
  })
})

describe('recordListingSaveNotificationFailed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({
      update: mockUpdate,
    })
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
  })

  it('records failed status with error message', async () => {
    const result = await recordListingSaveNotificationFailed('notif-1', 'No email')
    expect(result.ok).toBe(true)
  })
})
