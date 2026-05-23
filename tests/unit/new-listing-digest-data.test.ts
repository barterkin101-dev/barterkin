import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockIn = vi.fn()
const mockGte = vi.fn()
const mockInsert = vi.fn()
const mockRpc = vi.fn()
const mockNot = vi.fn()
const mockLte = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

import {
  getNewListingDigestRecipients,
  getNewListingDigestListingsForProfile,
  recordNewListingDigestSent,
} from '@/lib/data/new-listing-digest'

describe('new listing digest data layer', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getNewListingDigestRecipients', () => {
    it('returns eligible published profiles inactive 3+ days with county set', async () => {
      mockFrom.mockImplementation((t: string) => {
        if (t === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    not: vi.fn().mockReturnValue({
                      lte: vi.fn().mockReturnValue({
                        not: vi.fn().mockReturnValue({
                          order: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue({
                              data: [
                                { id: 'prof-1', display_name: 'Alice', username: 'alice', county_id: 131, owner_id: 'owner-1', last_login_at: '2026-05-10T00:00:00.000Z' },
                              ],
                              error: null,
                            }),
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        if (t === 'new_listing_digest_sends') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${t}`)
      })

      const { recipients, error } = await getNewListingDigestRecipients()

      expect(error).toBeNull()
      expect(recipients).toHaveLength(1)
      expect(recipients[0].id).toBe('prof-1')
    })

    it('filters out profiles who already received a digest in the last 3 days', async () => {
      mockFrom.mockImplementation((t: string) => {
        if (t === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    not: vi.fn().mockReturnValue({
                      lte: vi.fn().mockReturnValue({
                        not: vi.fn().mockReturnValue({
                          order: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue({
                              data: [
                                { id: 'prof-1', display_name: 'Alice', username: 'alice', county_id: 131, owner_id: 'owner-1', last_login_at: '2026-05-10T00:00:00.000Z' },
                              ],
                              error: null,
                            }),
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        if (t === 'new_listing_digest_sends') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({
                  data: [{ profile_id: 'prof-1' }],
                  error: null,
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${t}`)
      })

      const { recipients, error } = await getNewListingDigestRecipients()

      expect(error).toBeNull()
      expect(recipients).toHaveLength(0)
    })

    it('returns empty array on database error', async () => {
      mockFrom.mockImplementation((t: string) => {
        if (t === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    not: vi.fn().mockReturnValue({
                      lte: vi.fn().mockReturnValue({
                        not: vi.fn().mockReturnValue({
                          order: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue({
                              data: null,
                              error: { message: 'connection lost' },
                            }),
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${t}`)
      })

      const { recipients, error } = await getNewListingDigestRecipients()

      expect(error).toBe('fetch_failed')
      expect(recipients).toHaveLength(0)
    })
  })

  describe('getNewListingDigestListingsForProfile', () => {
    it('returns listings from the RPC', async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            id: 'listing-1',
            profile_id: 'seller-1',
            title: 'Fresh eggs',
            description: 'A dozen eggs',
            category_id: 1,
            county_id: 131,
            condition: 'good',
            trade_terms: null,
            price_estimate: null,
            created_at: '2026-05-13T00:00:00.000Z',
            seller_display_name: 'Farmer June',
            seller_username: 'farmer-june',
            seller_avatar_url: null,
            category_name: 'Farm',
            county_name: 'Cobb County',
          },
        ],
        error: null,
      })

      const { listings, error } = await getNewListingDigestListingsForProfile('prof-1')

      expect(error).toBeNull()
      expect(listings).toHaveLength(1)
      expect(listings[0].title).toBe('Fresh eggs')
    })

    it('returns empty array on RPC error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: 'P0001', message: 'function error' },
      })

      const { listings, error } = await getNewListingDigestListingsForProfile('prof-1')

      expect(error).toBe('query_failed')
      expect(listings).toHaveLength(0)
    })
  })

  describe('recordNewListingDigestSent', () => {
    it('records a digest send', async () => {
      mockFrom.mockImplementation((t: string) => {
        if (t === 'new_listing_digest_sends') {
          return {
            insert: vi.fn().mockResolvedValue({
              error: null,
            }),
          }
        }
        throw new Error(`Unexpected table: ${t}`)
      })

      const result = await recordNewListingDigestSent('prof-1', 3)

      expect(result.ok).toBe(true)
    })

    it('treats unique violation as success (already sent)', async () => {
      mockFrom.mockImplementation((t: string) => {
        if (t === 'new_listing_digest_sends') {
          return {
            insert: vi.fn().mockResolvedValue({
              error: { code: '23505', message: 'duplicate key' },
            }),
          }
        }
        throw new Error(`Unexpected table: ${t}`)
      })

      const result = await recordNewListingDigestSent('prof-1', 3)

      expect(result.ok).toBe(true)
    })

    it('returns error on other database errors', async () => {
      mockFrom.mockImplementation((t: string) => {
        if (t === 'new_listing_digest_sends') {
          return {
            insert: vi.fn().mockResolvedValue({
              error: { code: '50000', message: 'internal error' },
            }),
          }
        }
        throw new Error(`Unexpected table: ${t}`)
      })

      const result = await recordNewListingDigestSent('prof-1', 3)

      expect(result.ok).toBe(false)
      expect(result.error).toBe('internal error')
    })
  })
})
