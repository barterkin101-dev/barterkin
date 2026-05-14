import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

function resetChain() {
  mockFrom.mockReturnValue({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle })
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  mockInsert.mockResolvedValue({ error: null })
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: { id: 'user-1' } }, error: null }),
        ),
      },
      from: mockFrom,
    }),
  ),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { featureListing } from '@/lib/actions/listings'

describe('featureListing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
  })

  it('returns error when listing ID is missing', async () => {
    const result = await featureListing(null, new FormData())
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Listing ID is required.')
  })

  it('rejects non-premium members', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'profile-1', tier: 'free', credits: 10 },
      error: null,
    })

    const fd = new FormData()
    fd.append('listingId', 'listing-1')

    const result = await featureListing(null, fd)

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Only Premium members can feature listings.')
  })

  it('rejects members with insufficient credits', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'profile-1', tier: 'premium', credits: 4 },
      error: null,
    })

    const fd = new FormData()
    fd.append('listingId', 'listing-1')

    const result = await featureListing(null, fd)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('need 5 credits')
  })

  it('rejects already-featured listings', async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({
        data: { id: 'profile-1', tier: 'premium', credits: 10 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 'listing-1',
          profile_id: 'profile-1',
          status: 'active',
          featured_until: new Date(Date.now() + 60_000).toISOString(),
        },
        error: null,
      })

    const fd = new FormData()
    fd.append('listingId', 'listing-1')

    const result = await featureListing(null, fd)

    expect(result.ok).toBe(false)
    expect(result.error).toBe('This listing is already featured.')
  })

  it('deducts credits and sets featured_until for eligible premium listings', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValueOnce({ eq: updateEq })

    mockMaybeSingle
      .mockResolvedValueOnce({
        data: { id: 'profile-1', tier: 'premium', credits: 10 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 'listing-1',
          profile_id: 'profile-1',
          status: 'active',
          featured_until: null,
        },
        error: null,
      })

    const fd = new FormData()
    fd.append('listingId', 'listing-1')

    const result = await featureListing(null, fd)

    expect(result.ok).toBe(true)
    expect(result.featuredUntil).toBeDefined()
    expect(mockInsert).toHaveBeenCalledWith({
      profile_id: 'profile-1',
      amount: -5,
      reason: 'listing_feature',
    })
    expect(updateEq).toHaveBeenCalledWith('id', 'listing-1')
  })
})
