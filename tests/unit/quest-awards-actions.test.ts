import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  limitCreateListing: vi.fn().mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 0 }),
}))

vi.mock('@/lib/actions/quests', () => ({
  awardQuest: vi.fn().mockResolvedValue({ ok: true, awarded: true, credits: 5 }),
}))

import { createClient } from '@/lib/supabase/server'
import { awardQuest } from '@/lib/actions/quests'
import { saveListing } from '@/lib/actions/listings'
import { setPublished } from '@/lib/actions/profile'

const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440000'
const LISTING_ID = '660e8400-e29b-41d4-a716-446655440000'

function makeClient(fromMock: ReturnType<typeof vi.fn>) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    from: fromMock,
  } as unknown as Awaited<ReturnType<typeof createClient>>)
}

function makeListingFormData() {
  const fd = new FormData()
  fd.set('title', 'Fresh eggs')
  fd.set('description', 'Farm fresh eggs for trade')
  fd.set('categoryId', '1')
  fd.set('countyId', '13001')
  fd.set('condition', 'good')
  fd.set('tradeTerms', 'Trade for produce')
  fd.set('priceEstimate', '15')
  fd.set('images', JSON.stringify(['https://cdn.example.com/eggs.jpg']))
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('quest award hooks', () => {
  it('awards first listing quest only on new listing creation', async () => {
    const profileMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: PROFILE_ID, tier: 'premium' }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    const listingSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: LISTING_ID }, error: null })
    const listingSelect = vi.fn().mockReturnValue({ single: listingSingle })
    const listingUpsert = vi.fn().mockReturnValue({ select: listingSelect })

    const deleteImagesEq = vi.fn().mockResolvedValue({ error: null })
    const deleteImages = vi.fn().mockReturnValue({ eq: deleteImagesEq })
    const insertImages = vi.fn().mockResolvedValue({ error: null })

    const fromMock = vi
      .fn()
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ upsert: listingUpsert })
      .mockReturnValueOnce({ delete: deleteImages })
      .mockReturnValueOnce({ insert: insertImages })

    makeClient(fromMock)

    const result = await saveListing(null, makeListingFormData())

    expect(result).toEqual({ ok: true, listingId: LISTING_ID })
    expect(vi.mocked(awardQuest)).toHaveBeenCalledWith('quest_first_listing')
  })

  it('does not award first listing quest on listing update', async () => {
    const profileMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: PROFILE_ID, tier: 'premium' }, error: null })
    const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    const existingMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: LISTING_ID, profile_id: PROFILE_ID }, error: null })
    const existingEq = vi.fn().mockReturnValue({ maybeSingle: existingMaybeSingle })
    const existingSelect = vi.fn().mockReturnValue({ eq: existingEq })

    const listingSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: LISTING_ID }, error: null })
    const listingSelect = vi.fn().mockReturnValue({ single: listingSingle })
    const listingUpsert = vi.fn().mockReturnValue({ select: listingSelect })

    const deleteImagesEq = vi.fn().mockResolvedValue({ error: null })
    const deleteImages = vi.fn().mockReturnValue({ eq: deleteImagesEq })
    const insertImages = vi.fn().mockResolvedValue({ error: null })

    const fromMock = vi
      .fn()
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ select: existingSelect })
      .mockReturnValueOnce({ upsert: listingUpsert })
      .mockReturnValueOnce({ delete: deleteImages })
      .mockReturnValueOnce({ insert: insertImages })

    makeClient(fromMock)

    const fd = makeListingFormData()
    fd.set('listingId', LISTING_ID)

    const result = await saveListing(null, fd)

    expect(result).toEqual({ ok: true, listingId: LISTING_ID })
    expect(vi.mocked(awardQuest)).not.toHaveBeenCalled()
  })

  it('awards complete profile quest only when publishing succeeds', async () => {
    const profileMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: PROFILE_ID,
        display_name: 'Naeem',
        avatar_url: 'https://cdn.example.com/avatar.jpg',
        county_id: 13001,
        category_id: 5,
        skills_offered: [{ id: 1 }],
      },
      error: null,
    })
    const profileEqOwner = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle })
    const profileEqId = vi.fn().mockReturnValue({ eq: profileEqOwner })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEqId })

    const publishEqOwner = vi.fn().mockResolvedValue({ error: null })
    const publishEqId = vi.fn().mockReturnValue({ eq: publishEqOwner })
    const publishUpdate = vi.fn().mockReturnValue({ eq: publishEqId })

    const fromMock = vi
      .fn()
      .mockReturnValueOnce({ select: profileSelect })
      .mockReturnValueOnce({ update: publishUpdate })

    makeClient(fromMock)

    const fd = new FormData()
    fd.set('profileId', PROFILE_ID)
    fd.set('publish', 'true')

    const result = await setPublished(null, fd)

    expect(result).toEqual({ ok: true })
    expect(vi.mocked(awardQuest)).toHaveBeenCalledWith('quest_complete_profile')
  })

  it('does not award complete profile quest when unpublishing', async () => {
    const unpublishEqOwner = vi.fn().mockResolvedValue({ error: null })
    const unpublishEqId = vi.fn().mockReturnValue({ eq: unpublishEqOwner })
    const unpublishUpdate = vi.fn().mockReturnValue({ eq: unpublishEqId })

    const fromMock = vi.fn().mockReturnValueOnce({ update: unpublishUpdate })

    makeClient(fromMock)

    const fd = new FormData()
    fd.set('profileId', PROFILE_ID)
    fd.set('publish', 'false')

    const result = await setPublished(null, fd)

    expect(result).toEqual({ ok: true })
    expect(vi.mocked(awardQuest)).not.toHaveBeenCalled()
  })
})
