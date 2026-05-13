import { describe, it, expect, vi } from 'vitest'
import { getSiteUpdates, markSiteUpdatesRead } from '@/lib/data/site-updates'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockIn = vi.fn()
const mockUpsert = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
    }),
  ),
}))

function resetChain() {
  mockFrom.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder })
  mockEq.mockReturnValue({ order: mockOrder, in: mockIn })
  mockOrder.mockReturnValue({ limit: mockLimit })
  mockIn.mockReturnValue({ data: [], error: null })
  mockLimit.mockResolvedValue({ data: [], error: null })
}

describe('getSiteUpdates', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    resetChain()
  })

  it('returns updates and counts unread for anonymous users', async () => {
    const updates = [
      { id: 'u1', title: 'New feature', body: 'We shipped X', category: 'feature', published_at: '2024-01-01T00:00:00Z', is_published: true },
      { id: 'u2', title: 'Bug fix', body: 'Fixed Y', category: 'fix', published_at: '2024-01-02T00:00:00Z', is_published: true },
    ]
    mockLimit.mockResolvedValue({ data: updates, error: null })

    const result = await getSiteUpdates(null)

    expect(result.updates).toHaveLength(2)
    expect(result.unreadCount).toBe(2)
  })

  it('counts only unread updates for logged-in users', async () => {
    const updates = [
      { id: 'u1', title: 'New feature', body: 'We shipped X', category: 'feature', published_at: '2024-01-01T00:00:00Z', is_published: true },
      { id: 'u2', title: 'Bug fix', body: 'Fixed Y', category: 'fix', published_at: '2024-01-02T00:00:00Z', is_published: true },
    ]
    // First call: get updates
    mockLimit.mockResolvedValueOnce({ data: updates, error: null })
    // Second call: get reads — reuse the default query chain and override only the final result.
    mockIn.mockReturnValueOnce({ data: [{ update_id: 'u1' }], error: null })

    const result = await getSiteUpdates('profile-1')

    expect(result.updates).toHaveLength(2)
    expect(result.unreadCount).toBe(1) // u2 is unread
  })

  it('returns empty on error', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { code: '42P01' } })

    const result = await getSiteUpdates(null)

    expect(result.updates).toEqual([])
    expect(result.unreadCount).toBe(0)
  })
})

describe('markSiteUpdatesRead', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockFrom.mockReturnValue({ upsert: mockUpsert })
    mockUpsert.mockResolvedValue({ error: null })
  })

  it('upserts read records for all update ids', async () => {
    await markSiteUpdatesRead('profile-1', ['u1', 'u2'])

    expect(mockUpsert).toHaveBeenCalledWith(
      [
        { profile_id: 'profile-1', update_id: 'u1' },
        { profile_id: 'profile-1', update_id: 'u2' },
      ],
      { onConflict: 'profile_id,update_id', ignoreDuplicates: true },
    )
  })
})
