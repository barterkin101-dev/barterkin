import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockCreateSavedSearch,
  mockDeleteSavedSearch,
  mockToggleSavedSearchAlert,
  mockCaptureEvent,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockCreateSavedSearch: vi.fn(),
  mockDeleteSavedSearch: vi.fn(),
  mockToggleSavedSearchAlert: vi.fn(),
  mockCaptureEvent: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'owner-1' } }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'prof-1' }, error: null })),
        })),
      })),
    })),
  })),
}))

vi.mock('@/lib/data/saved-searches', () => ({
  createSavedSearch: mockCreateSavedSearch,
  deleteSavedSearch: mockDeleteSavedSearch,
  toggleSavedSearchAlert: mockToggleSavedSearchAlert,
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: mockCaptureEvent,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

import { saveSearch, removeSavedSearch, toggleSearchAlert } from '@/lib/actions/saved-searches'

describe('saveSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCreateSavedSearch.mockResolvedValue({
      search: {
        id: 'ss-1',
        profile_id: 'prof-1',
        query: 'eggs',
        category_id: 1,
        county_id: 131,
        email_alert_enabled: true,
        last_alert_sent_at: null,
        created_at: '2026-05-19T00:00:00.000Z',
        updated_at: '2026-05-19T00:00:00.000Z',
      },
      error: null,
    })
  })

  it('creates a saved search and fires analytics', async () => {
    const fd = new FormData()
    fd.set('profileId', 'prof-1')
    fd.set('query', 'eggs')
    fd.set('categoryId', '1')
    fd.set('countyId', '131')

    const result = await saveSearch(null, fd)
    expect(result.ok).toBe(true)
    expect(result.searchId).toBe('ss-1')
    expect(mockCaptureEvent).toHaveBeenCalledWith('prof-1', 'saved_search_created', {
      query: 'eggs',
      category_id: 1,
      county_id: 131,
      search_id: 'ss-1',
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/directory')
  })

  it('returns error when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockReturnValueOnce({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: new Error('auth') })),
      },
      from: vi.fn(),
    } as unknown as ReturnType<typeof createClient>)

    const fd = new FormData()
    fd.set('profileId', 'prof-1')
    const result = await saveSearch(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Not authenticated.')
  })

  it('returns error when profileId is missing', async () => {
    const fd = new FormData()
    const result = await saveSearch(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Profile ID is required.')
  })

  it('returns error when create fails', async () => {
    mockCreateSavedSearch.mockResolvedValue({ search: null, error: 'insert_failed' })
    const fd = new FormData()
    fd.set('profileId', 'prof-1')
    const result = await saveSearch(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('insert_failed')
  })
})

describe('removeSavedSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockDeleteSavedSearch.mockResolvedValue({ ok: true, error: null })
  })

  it('deletes a saved search and fires analytics', async () => {
    const fd = new FormData()
    fd.set('searchId', 'ss-1')

    const result = await removeSavedSearch(null, fd)
    expect(result.ok).toBe(true)
    expect(mockCaptureEvent).toHaveBeenCalledWith('system', 'saved_search_deleted', { search_id: 'ss-1' })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/directory')
  })

  it('returns error when searchId is missing', async () => {
    const fd = new FormData()
    const result = await removeSavedSearch(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Search ID is required.')
  })

  it('returns error when delete fails', async () => {
    mockDeleteSavedSearch.mockResolvedValue({ ok: false, error: 'delete_failed' })
    const fd = new FormData()
    fd.set('searchId', 'ss-1')
    const result = await removeSavedSearch(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('delete_failed')
  })
})

describe('toggleSearchAlert', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockToggleSavedSearchAlert.mockResolvedValue({ ok: true, error: null })
  })

  it('toggles alert on and fires analytics', async () => {
    const fd = new FormData()
    fd.set('searchId', 'ss-1')
    fd.set('enabled', 'true')

    const result = await toggleSearchAlert(null, fd)
    expect(result.ok).toBe(true)
    expect(mockCaptureEvent).toHaveBeenCalledWith('system', 'saved_search_alert_toggled', {
      search_id: 'ss-1',
      enabled: true,
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
  })

  it('toggles alert off and fires analytics', async () => {
    const fd = new FormData()
    fd.set('searchId', 'ss-1')
    fd.set('enabled', 'false')

    const result = await toggleSearchAlert(null, fd)
    expect(result.ok).toBe(true)
    expect(mockCaptureEvent).toHaveBeenCalledWith('system', 'saved_search_alert_toggled', {
      search_id: 'ss-1',
      enabled: false,
    })
  })

  it('returns error when searchId is missing', async () => {
    const fd = new FormData()
    fd.set('enabled', 'true')
    const result = await toggleSearchAlert(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Search ID is required.')
  })

  it('returns error when toggle fails', async () => {
    mockToggleSavedSearchAlert.mockResolvedValue({ ok: false, error: 'update_failed' })
    const fd = new FormData()
    fd.set('searchId', 'ss-1')
    fd.set('enabled', 'true')
    const result = await toggleSearchAlert(null, fd)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('update_failed')
  })
})
