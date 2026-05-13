import { describe, it, expect, vi } from 'vitest'
import { submitFeatureRequest } from '@/lib/actions/feature-requests'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockInsert = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null }),
        ),
      },
      from: mockFrom,
    }),
  ),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

function resetChain() {
  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle })
  mockMaybeSingle.mockResolvedValue({ data: { id: 'prof-1' }, error: null })
  mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'req-1' }, error: null }) }) })
}

describe('submitFeatureRequest', () => {
  beforeEach(() => {
    vi.resetAllMocks()
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

    const fd = new FormData()
    const result = await submitFeatureRequest(null, fd)

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Not authenticated.')
  })

  it('returns error when title is too short', async () => {
    const fd = new FormData()
    fd.append('title', 'Hi')
    fd.append('description', 'This is a valid description that is long enough.')
    fd.append('category', 'general')

    const result = await submitFeatureRequest(null, fd)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Title')
  })

  it('returns error when description is too short', async () => {
    const fd = new FormData()
    fd.append('title', 'A valid feature title')
    fd.append('description', 'Too short')
    fd.append('category', 'general')

    const result = await submitFeatureRequest(null, fd)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Description')
  })

  it('submits successfully with valid data', async () => {
    mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'req-1' }, error: null }) }) })

    const fd = new FormData()
    fd.append('title', 'Add dark mode')
    fd.append('description', 'I would love a dark mode option for the dashboard because it is easier on the eyes at night.')
    fd.append('category', 'ui')

    const result = await submitFeatureRequest(null, fd)

    expect(result.ok).toBe(true)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      profile_id: 'prof-1',
      title: 'Add dark mode',
      category: 'ui',
    }))
  })
})
