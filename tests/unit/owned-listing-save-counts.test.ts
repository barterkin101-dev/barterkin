import { beforeEach, describe, expect, it, vi } from 'vitest'

const fromMock = vi.fn()
const errorMock = vi.fn()
const selectMock = vi.fn()
const inMock = vi.fn()
const eqMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: fromMock,
  })),
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    error: errorMock,
  })),
}))

import { getOwnedListingSaveCounts } from '@/lib/data/owned-listing-save-counts'

describe('getOwnedListingSaveCounts', () => {
  beforeEach(() => {
    fromMock.mockReset()
    errorMock.mockReset()
    selectMock.mockReset()
    inMock.mockReset()
    eqMock.mockReset()

    eqMock.mockResolvedValue({
      data: [
        { listing_id: 'listing-1' },
        { listing_id: 'listing-1' },
        { listing_id: 'listing-2' },
      ],
      error: null,
    })
    inMock.mockReturnValue({ eq: eqMock })
    selectMock.mockReturnValue({ in: inMock })
    fromMock.mockReturnValue({ select: selectMock })
  })

  it('returns aggregated save counts scoped to the owner listing ids', async () => {
    const result = await getOwnedListingSaveCounts('profile-1', ['listing-1', 'listing-2'])

    expect(fromMock).toHaveBeenCalledWith('saved_listings')
    expect(selectMock).toHaveBeenCalledWith('listing_id, listings!inner(profile_id)')
    expect(inMock).toHaveBeenCalledWith('listing_id', ['listing-1', 'listing-2'])
    expect(eqMock).toHaveBeenCalledWith('listings.profile_id', 'profile-1')
    expect(result).toEqual({
      'listing-1': 2,
      'listing-2': 1,
    })
  })

  it('returns an empty object without querying when no listing ids are provided', async () => {
    await expect(getOwnedListingSaveCounts('profile-1', [])).resolves.toEqual({})
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('falls back to an empty object when the admin query fails', async () => {
    eqMock.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'boom' },
    })

    await expect(getOwnedListingSaveCounts('profile-1', ['listing-1'])).resolves.toEqual({})
    expect(errorMock).toHaveBeenCalled()
  })
})
