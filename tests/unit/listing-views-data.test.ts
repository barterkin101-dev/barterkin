import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recordListingView, getRecentListingViews } from '@/lib/data/listing-views'

const mockFrom = vi.fn()
const mockUpsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }) },
    }),
  ),
}))

describe('recordListingView', () => {
  beforeEach(() => {
    mockFrom.mockReturnValue({ upsert: mockUpsert })
    mockUpsert.mockReset()
  })

  it('upserts a view row with onConflict', async () => {
    mockUpsert.mockResolvedValue({ error: null })
    const result = await recordListingView('profile-1', 'listing-1')
    expect(result.ok).toBe(true)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ profile_id: 'profile-1', listing_id: 'listing-1' }),
      { onConflict: 'profile_id,listing_id' },
    )
  })

  it('returns error on upsert failure', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'db down', code: '500' } })
    const result = await recordListingView('profile-1', 'listing-1')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('db down')
  })
})

describe('getRecentListingViews', () => {
  beforeEach(() => {
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
    mockLimit.mockReset()
  })

  it('returns empty array on error', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { code: '500' } })
    const result = await getRecentListingViews('profile-1')
    expect(result).toEqual([])
  })

  it('returns enriched rows ordered by viewed_at desc', async () => {
    const rows = [
      {
        id: 'view-1',
        profile_id: 'profile-1',
        listing_id: 'listing-1',
        viewed_at: '2026-05-20T10:00:00Z',
        listings: {
          id: 'listing-1',
          title: 'Test Listing',
          description: null,
          condition: null,
          trade_terms: null,
          price_estimate: null,
          status: 'active',
          created_at: '2026-05-20T09:00:00Z',
          updated_at: '2026-05-20T09:00:00Z',
          featured_until: null,
          boosted_until: null,
          counties: { name: 'Fulton' },
          categories: { name: 'Services' },
          listing_images: [{ url: 'https://example.com/img.jpg' }],
          profiles: { id: 'owner-1', display_name: 'Alice', username: 'alice', avatar_url: null },
        },
      },
    ]
    mockLimit.mockResolvedValue({ data: rows, error: null })
    const result = await getRecentListingViews('profile-1', 5)
    expect(result).toHaveLength(1)
    expect(result[0].listings?.title).toBe('Test Listing')
    expect(mockEq).toHaveBeenCalledWith('profile_id', 'profile-1')
    expect(mockOrder).toHaveBeenCalledWith('viewed_at', { ascending: false })
    expect(mockLimit).toHaveBeenCalledWith(5)
  })
})
