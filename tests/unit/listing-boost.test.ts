/**
 * Listing boost action — unit tests
 * Tests boostListing: auth, ownership, credits, active status, already boosted.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) })
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

import { boostListing } from '@/lib/actions/listings'

describe('boostListing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
  })

  it('returns error when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: new Error('auth') })),
      },
      from: mockFrom,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const result = await boostListing(null, new FormData())
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Not authenticated.')
  })

  it('returns error when listing ID is missing', async () => {
    const result = await boostListing(null, new FormData())
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Listing ID is required.')
  })

  it('returns error when profile not found', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const fd = new FormData()
    fd.append('listingId', 'listing-1')
    const result = await boostListing(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Profile not found.')
  })

  it('returns error when insufficient credits', async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { id: 'profile-1', credits: 0 }, error: null }) // profile lookup

    const fd = new FormData()
    fd.append('listingId', 'listing-1')
    const result = await boostListing(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('need 1 credit')
  })

  it('returns error when listing not found', async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { id: 'profile-1', credits: 5 }, error: null }) // profile
      .mockResolvedValueOnce({ data: null, error: null }) // listing

    const fd = new FormData()
    fd.append('listingId', 'listing-1')
    const result = await boostListing(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Listing not found.')
  })

  it('returns error when not owner', async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { id: 'profile-1', credits: 5 }, error: null }) // profile
      .mockResolvedValueOnce({ data: { id: 'listing-1', profile_id: 'other-profile', status: 'active', boosted_until: null }, error: null }) // listing

    const fd = new FormData()
    fd.append('listingId', 'listing-1')
    const result = await boostListing(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('You can only boost your own listings.')
  })

  it('returns error when listing is not active', async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { id: 'profile-1', credits: 5 }, error: null })
      .mockResolvedValueOnce({ data: { id: 'listing-1', profile_id: 'profile-1', status: 'paused', boosted_until: null }, error: null })

    const fd = new FormData()
    fd.append('listingId', 'listing-1')
    const result = await boostListing(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Only active listings can be boosted.')
  })

  it('returns error when already boosted', async () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { id: 'profile-1', credits: 5 }, error: null })
      .mockResolvedValueOnce({ data: { id: 'listing-1', profile_id: 'profile-1', status: 'active', boosted_until: future }, error: null })

    const fd = new FormData()
    fd.append('listingId', 'listing-1')
    const result = await boostListing(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('This listing is already boosted.')
  })

  it('successfully boosts an active listing with sufficient credits', async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { id: 'profile-1', credits: 5 }, error: null })
      .mockResolvedValueOnce({ data: { id: 'listing-1', profile_id: 'profile-1', status: 'active', boosted_until: null }, error: null })

    mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) })

    const fd = new FormData()
    fd.append('listingId', 'listing-1')
    const result = await boostListing(null, fd)
    expect(result.ok).toBe(true)
    expect(result.boostedUntil).toBeDefined()
    // Should be ~7 days from now
    const boostedDate = new Date(result.boostedUntil!)
    const now = new Date()
    const diffDays = (boostedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThan(6)
    expect(diffDays).toBeLessThan(8)
  })

  it('allows re-boosting after previous boost expired', async () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { id: 'profile-1', credits: 5 }, error: null })
      .mockResolvedValueOnce({ data: { id: 'listing-1', profile_id: 'profile-1', status: 'active', boosted_until: past }, error: null })

    mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) })

    const fd = new FormData()
    fd.append('listingId', 'listing-1')
    const result = await boostListing(null, fd)
    expect(result.ok).toBe(true)
    expect(result.boostedUntil).toBeDefined()
  })
})
