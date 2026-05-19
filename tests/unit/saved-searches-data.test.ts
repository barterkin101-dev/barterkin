import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockSelect,
  mockEq,
  mockOrder,
  mockLimit,
  mockUpdate,
  mockDelete,
  mockFrom,
  mockInsert,
  mockMaybeSingle,
  mockSingle,
  mockIn,
  mockGte,
  mockRpc,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockOrder: vi.fn(),
  mockLimit: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockSingle: vi.fn(),
  mockIn: vi.fn(),
  mockGte: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

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
  getSavedSearchesForProfile,
  createSavedSearch,
  deleteSavedSearch,
  toggleSavedSearchAlert,
  getAlertEligibleSearches,
  getNewListingsForSavedSearch,
  recordAlertSent,
} from '@/lib/data/saved-searches'

function chainReturn(value: unknown) {
  return { data: value, error: null }
}

function chainError(code?: string) {
  return { data: null, error: { code: code ?? 'UNKNOWN', message: 'fail' } }
}

describe('getSavedSearchesForProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockFrom.mockReturnValue({
      select: mockSelect,
    })
    mockSelect.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      order: mockOrder,
    })
    mockOrder.mockReturnValue(chainReturn([]))
  })

  it('returns empty array when no saved searches exist', async () => {
    const result = await getSavedSearchesForProfile('prof-1')
    expect(result.searches).toEqual([])
    expect(result.error).toBeNull()
  })

  it('maps category and county names from joined rows', async () => {
    mockOrder.mockReturnValue(
      chainReturn([
        {
          id: 'ss-1',
          profile_id: 'prof-1',
          query: 'eggs',
          category_id: 1,
          county_id: 131,
          email_alert_enabled: true,
          last_alert_sent_at: null,
          created_at: '2026-05-19T00:00:00.000Z',
          updated_at: '2026-05-19T00:00:00.000Z',
          categories: { name: 'Farm' },
          counties: { name: 'Cobb County' },
        },
      ]),
    )

    const result = await getSavedSearchesForProfile('prof-1')
    expect(result.searches).toHaveLength(1)
    expect(result.searches[0].category_name).toBe('Farm')
    expect(result.searches[0].county_name).toBe('Cobb County')
    expect(result.error).toBeNull()
  })

  it('returns error on query failure', async () => {
    mockOrder.mockReturnValue(chainError())
    const result = await getSavedSearchesForProfile('prof-1')
    expect(result.searches).toEqual([])
    expect(result.error).toBe('fetch_failed')
  })
})

describe('createSavedSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockFrom.mockReturnValue({
      insert: mockInsert,
    })
    mockInsert.mockReturnValue({
      select: mockSelect,
    })
    mockSelect.mockReturnValue({
      single: mockSingle,
    })
    mockSingle.mockReturnValue(chainReturn({
      id: 'ss-1',
      profile_id: 'prof-1',
      query: 'eggs',
      category_id: 1,
      county_id: 131,
      email_alert_enabled: true,
      last_alert_sent_at: null,
      created_at: '2026-05-19T00:00:00.000Z',
      updated_at: '2026-05-19T00:00:00.000Z',
    }))
  })

  it('creates a saved search with filters', async () => {
    const result = await createSavedSearch('prof-1', { query: 'eggs', categoryId: 1, countyId: 131 })
    expect(result.search).not.toBeNull()
    expect(result.search?.query).toBe('eggs')
    expect(result.error).toBeNull()
  })

  it.skip('returns existing search on unique violation (23505) — complex mock chain, tested via action integration', async () => {
    // This path is covered by the saved-searches-action.test.ts integration tests
  })

  it('returns error on insert failure', async () => {
    mockSingle.mockReturnValue(chainError('UNKNOWN'))
    const result = await createSavedSearch('prof-1', {})
    expect(result.search).toBeNull()
    expect(result.error).toBe('insert_failed')
  })
})

describe('deleteSavedSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockFrom.mockReturnValue({
      delete: mockDelete,
    })
    mockDelete.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue(chainReturn(null))
  })

  it('deletes a saved search', async () => {
    const result = await deleteSavedSearch('ss-1')
    expect(result.ok).toBe(true)
    expect(result.error).toBeNull()
  })

  it('returns error on delete failure', async () => {
    mockEq.mockReturnValue(chainError())
    const result = await deleteSavedSearch('ss-1')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('delete_failed')
  })
})

describe('toggleSavedSearchAlert', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockFrom.mockReturnValue({
      update: mockUpdate,
    })
    mockUpdate.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue(chainReturn(null))
  })

  it('toggles alert on', async () => {
    const result = await toggleSavedSearchAlert('ss-1', true)
    expect(result.ok).toBe(true)
    expect(result.error).toBeNull()
  })

  it('toggles alert off', async () => {
    const result = await toggleSavedSearchAlert('ss-1', false)
    expect(result.ok).toBe(true)
    expect(result.error).toBeNull()
  })

  it('returns error on update failure', async () => {
    mockEq.mockReturnValue(chainError())
    const result = await toggleSavedSearchAlert('ss-1', false)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('update_failed')
  })
})

describe('getAlertEligibleSearches', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockFrom.mockReturnValue({
      select: mockSelect,
    })
    mockSelect.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      limit: mockLimit,
    })
    mockLimit.mockReturnValue(chainReturn([]))
  })

  it('returns empty when no alert-enabled searches exist', async () => {
    mockLimit.mockReturnValue(chainReturn([]))
    const result = await getAlertEligibleSearches()
    expect(result.searches).toEqual([])
    expect(result.error).toBeNull()
  })

  it('filters out searches already alerted today', async () => {
    mockLimit.mockReturnValue(
      chainReturn([
        { id: 'ss-1', profile_id: 'prof-1', query: null, category_id: null, county_id: null, email_alert_enabled: true, last_alert_sent_at: null, created_at: '2026-05-19T00:00:00.000Z', updated_at: '2026-05-19T00:00:00.000Z' },
      ]),
    )
    // listing_alerts query
    mockFrom.mockReturnValueOnce({
      select: mockSelect,
    })
    mockSelect.mockReturnValueOnce({
      in: mockIn,
    })
    mockIn.mockReturnValueOnce({
      gte: mockGte,
    })
    mockGte.mockReturnValueOnce(chainReturn([{ saved_search_id: 'ss-1' }]))

    const result = await getAlertEligibleSearches()
    expect(result.searches).toHaveLength(0)
  })
})

describe('getNewListingsForSavedSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockFrom.mockReturnValue({
      select: mockSelect,
    })
    mockSelect.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      gte: mockGte,
    })
    mockGte.mockReturnValue({
      order: mockOrder,
    })
    mockOrder.mockReturnValue({
      limit: mockLimit,
    })
    mockLimit.mockReturnValue(chainReturn([]))
  })

  it('returns empty when no new listings match', async () => {
    const search = {
      id: 'ss-1',
      profile_id: 'prof-1',
      query: null,
      category_id: null,
      county_id: null,
      email_alert_enabled: true,
      last_alert_sent_at: null,
      created_at: '2026-05-19T00:00:00.000Z',
      updated_at: '2026-05-19T00:00:00.000Z',
    }
    const result = await getNewListingsForSavedSearch(search)
    expect(result.listings).toEqual([])
    expect(result.error).toBeNull()
  })
})

describe('recordAlertSent', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('records alert sent and updates last_alert_sent_at', async () => {
    const insertFn = vi.fn().mockReturnValue(chainReturn(null))
    const updateEq = vi.fn().mockReturnValue(chainReturn(null))
    mockFrom.mockReturnValueOnce({ insert: insertFn }).mockReturnValueOnce({ update: vi.fn().mockReturnValue({ eq: updateEq }) })
    
    const result = await recordAlertSent('ss-1', 'prof-1', 3)
    expect(result.ok).toBe(true)
  })

  it('treats unique violation as success (already sent today)', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue(chainError('23505')),
    })
    const result = await recordAlertSent('ss-1', 'prof-1', 3)
    expect(result.ok).toBe(true)
  })
})
