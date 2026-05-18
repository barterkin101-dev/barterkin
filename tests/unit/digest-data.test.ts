import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockIn = vi.fn()
const mockGte = vi.fn()
const mockInsert = vi.fn()
const mockRpc = vi.fn()

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
  getDigestRecipients,
  getDigestListingsForProfile,
  getUnreadMessageCountForProfile,
  recordDigestSent,
} from '@/lib/data/digest'

describe('digest data layer', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  function mockTableChain(table: string) {
    mockFrom.mockImplementation((t: string) => {
      if (t !== table) {
        throw new Error(`Unexpected table: ${t}`)
      }
      return {
        select: mockSelect,
        insert: mockInsert,
      }
    })
  }

  describe('getDigestRecipients', () => {
    it('returns eligible published profiles with digest enabled', async () => {
      mockTableChain('profiles')
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  { id: 'prof-1', display_name: 'Alice', username: 'alice', county_id: 131, owner_id: 'owner-1' },
                  { id: 'prof-2', display_name: 'Bob', username: 'bob', county_id: 132, owner_id: 'owner-2' },
                ],
                error: null,
              }),
            }),
          }),
        }),
      })

      // Second query: email_digests (no recent sends)
      mockFrom.mockImplementationOnce((t: string) => {
        if (t !== 'profiles') throw new Error(`Unexpected table: ${t}`)
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      { id: 'prof-1', display_name: 'Alice', username: 'alice', county_id: 131, owner_id: 'owner-1' },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      })

      // Mock email_digests query
      mockFrom.mockImplementationOnce((t: string) => {
        if (t !== 'email_digests') throw new Error(`Unexpected table: ${t}`)
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const { recipients, error } = await getDigestRecipients()

      expect(error).toBeNull()
      expect(recipients).toHaveLength(1)
      expect(recipients[0].id).toBe('prof-1')
    })

    it('filters out profiles who already received a digest this week', async () => {
      mockFrom.mockImplementation((t: string) => {
        if (t === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [
                        { id: 'prof-1', display_name: 'Alice', username: 'alice', county_id: 131, owner_id: 'owner-1' },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        if (t === 'email_digests') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gte: vi.fn().mockResolvedValue({
                    data: [{ profile_id: 'prof-1' }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${t}`)
      })

      const { recipients, error } = await getDigestRecipients()

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
                    limit: vi.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'connection lost' },
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${t}`)
      })

      const { recipients, error } = await getDigestRecipients()

      expect(error).toBe('fetch_failed')
      expect(recipients).toHaveLength(0)
    })
  })

  describe('getDigestListingsForProfile', () => {
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

      const { listings, error } = await getDigestListingsForProfile('prof-1')

      expect(error).toBeNull()
      expect(listings).toHaveLength(1)
      expect(listings[0].title).toBe('Fresh eggs')
    })

    it('returns empty array on RPC error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: 'P0001', message: 'function error' },
      })

      const { listings, error } = await getDigestListingsForProfile('prof-1')

      expect(error).toBe('query_failed')
      expect(listings).toHaveLength(0)
    })
  })

  describe('getUnreadMessageCountForProfile', () => {
    it('counts unread messages across conversations', async () => {
      mockFrom.mockImplementation((t: string) => {
        if (t === 'conversation_participants') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { conversation_id: 'conv-1', last_read_at: '2026-05-10T00:00:00.000Z' },
                  { conversation_id: 'conv-2', last_read_at: null },
                ],
                error: null,
              }),
            }),
          }
        }
        if (t === 'messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'msg-1', sender_profile_id: 'other-1', created_at: '2026-05-12T00:00:00.000Z' },
                    { id: 'msg-2', sender_profile_id: 'other-1', created_at: '2026-05-11T00:00:00.000Z' },
                    { id: 'msg-3', sender_profile_id: 'other-2', created_at: '2026-05-13T00:00:00.000Z' },
                  ],
                  error: null,
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${t}`)
      })

      const count = await getUnreadMessageCountForProfile('prof-1')

      // The mock returns the same 3 messages for each conversation call
      // conv-1: 3 unread (all after last_read_at for 2, all for null)
      // Actually the mock is called per-conversation and returns 3 each time
      expect(count).toBe(6)
    })

    it('returns 0 when profile has no conversations', async () => {
      mockFrom.mockImplementation((t: string) => {
        if (t === 'conversation_participants') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${t}`)
      })

      const count = await getUnreadMessageCountForProfile('prof-1')
      expect(count).toBe(0)
    })

    it('returns 0 on database error', async () => {
      mockFrom.mockImplementation((t: string) => {
        if (t === 'conversation_participants') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'connection lost' },
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${t}`)
      })

      const count = await getUnreadMessageCountForProfile('prof-1')
      expect(count).toBe(0)
    })
  })

  describe('recordDigestSent', () => {
    it('records a digest send', async () => {
      mockFrom.mockImplementation((t: string) => {
        if (t === 'email_digests') {
          return {
            insert: vi.fn().mockResolvedValue({
              error: null,
            }),
          }
        }
        throw new Error(`Unexpected table: ${t}`)
      })

      const result = await recordDigestSent('prof-1', 3)

      expect(result.ok).toBe(true)
    })

    it('treats unique violation as success (already sent)', async () => {
      mockFrom.mockImplementation((t: string) => {
        if (t === 'email_digests') {
          return {
            insert: vi.fn().mockResolvedValue({
              error: { code: '23505', message: 'duplicate key' },
            }),
          }
        }
        throw new Error(`Unexpected table: ${t}`)
      })

      const result = await recordDigestSent('prof-1', 3)

      expect(result.ok).toBe(true)
    })

    it('returns error on other database errors', async () => {
      mockFrom.mockImplementation((t: string) => {
        if (t === 'email_digests') {
          return {
            insert: vi.fn().mockResolvedValue({
              error: { code: '50000', message: 'internal error' },
            }),
          }
        }
        throw new Error(`Unexpected table: ${t}`)
      })

      const result = await recordDigestSent('prof-1', 3)

      expect(result.ok).toBe(false)
      expect(result.error).toBe('internal error')
    })
  })
})
