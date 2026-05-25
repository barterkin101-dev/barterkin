import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockNeq = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockUpsert = vi.fn()
const mockDelete = vi.fn()

function resetChain() {
  mockFrom.mockReturnValue({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
    upsert: mockUpsert,
    delete: mockDelete,
  })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle, neq: mockNeq })
  mockNeq.mockReturnValue({ count: 0, error: null })
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  mockInsert.mockResolvedValue({ error: null })
  mockUpsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'listing-1' }, error: null }) }) })
  mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
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

vi.mock('@/lib/rate-limit', () => ({
  limitCreateListing: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/actions/quests', () => ({
  awardQuest: vi.fn().mockResolvedValue({ ok: true, awarded: false }),
}))

import { saveListing } from '@/lib/actions/listings'

function makeValidFormData(): FormData {
  const fd = new FormData()
  fd.append('title', 'Test Listing Title')
  fd.append('description', 'A test listing description that is long enough to pass validation.')
  fd.append('categoryId', '1')
  fd.append('countyId', '1')
  fd.append('condition', 'new')
  fd.append('tradeTerms', '')
  fd.append('priceEstimate', '')
  fd.append('images', JSON.stringify(['https://example.com/image.jpg']))
  return fd
}

describe('saveListing listing limit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
  })

  it('returns listing_limit_reached with upsell data when free member at cap', async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({
        data: { id: 'profile-1', tier: 'free' },
        error: null,
      })

    // The limit check: from('listings').select('id', {count:'exact', head: true}).eq('profile_id', ...).neq('status', 'cancelled')
    // eq returns { maybeSingle, neq }, neq returns the count result
    mockNeq.mockReturnValue({ count: 3, error: null })

    const result = await saveListing(null, makeValidFormData())

    expect(result.ok).toBe(false)
    expect(result.error).toBe('listing_limit_reached')
    expect(result.fieldErrors?._upsell).toBeDefined()

    const upsell = JSON.parse(result.fieldErrors!._upsell)
    expect(upsell.used).toBe(3)
    expect(upsell.limit).toBe(3)
    expect(upsell.premiumMonthlyPrice).toBe('$9')
    expect(upsell.premiumAnnualSavings).toBe('$18')
  })

  it('allows creating listing when free member is under cap', async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({
        data: { id: 'profile-1', tier: 'free' },
        error: null,
      })

    mockNeq.mockReturnValue({ count: 2, error: null })

    const result = await saveListing(null, makeValidFormData())

    expect(result.ok).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('allows unlimited listings for premium members', async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({
        data: { id: 'profile-1', tier: 'premium' },
        error: null,
      })

    const result = await saveListing(null, makeValidFormData())

    expect(result.ok).toBe(true)
    expect(result.error).toBeUndefined()
  })
})
