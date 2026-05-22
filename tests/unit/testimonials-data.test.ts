import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockFrom,
  mockSelect,
  mockEq,
  mockOrder,
  mockLimit,
  mockMaybeSingle,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockOrder: vi.fn(),
  mockLimit: vi.fn(),
  mockMaybeSingle: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({ error: vi.fn() })),
}))

import { getFeaturedTestimonials, canSubmitTestimonial } from '@/lib/data/testimonials'

function okResult(data: unknown) {
  return { data, error: null }
}

function errResult(code = 'UNKNOWN') {
  return { data: null, error: { code, message: 'fail' } }
}

describe('getFeaturedTestimonials', () => {
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
    mockOrder.mockReturnValue({
      limit: mockLimit,
    })
  })

  it('returns testimonials on success', async () => {
    const mockData = [
      {
        id: 't1',
        quote: 'Great trade!',
        trade_context: 'Bread for plumbing',
        created_at: '2026-05-20T10:00:00Z',
        profile: {
          id: 'p1',
          display_name: 'Alice',
          username: 'alice',
          avatar_url: null,
          counties: { name: 'Fulton' },
        },
      },
    ]
    mockLimit.mockReturnValue(okResult(mockData))

    const result = await getFeaturedTestimonials()
    expect(result.error).toBeNull()
    expect(result.testimonials).toHaveLength(1)
    expect(result.testimonials[0].quote).toBe('Great trade!')
    expect(result.testimonials[0].profile?.county_name).toBe('Fulton')
  })

  it('returns empty array on error', async () => {
    mockLimit.mockReturnValue(errResult('42P01'))
    const result = await getFeaturedTestimonials()
    expect(result.testimonials).toHaveLength(0)
    expect(result.error).toBeTruthy()
  })
})

describe('canSubmitTestimonial', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  function setupMocks(overrides?: {
    profile?: { id: string } | null
    existing?: { id: string } | null
    trade?: { id: string } | null
  }) {
    const {
      profile = { id: 'prof-1' },
      existing = null,
      trade = { id: 'list-1' },
    } = overrides ?? {}

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue(okResult(profile)),
        }
      }
      if (table === 'testimonials') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue(okResult(existing)),
        }
      }
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue(okResult(trade)),
        }
      }
      return {}
    })
  }

  it('allows submission when profile exists, has completed trade, and no existing testimonial', async () => {
    setupMocks()
    const result = await canSubmitTestimonial('user-1')
    expect(result.canSubmit).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('blocks when profile not found', async () => {
    setupMocks({ profile: null })
    const result = await canSubmitTestimonial('user-1')
    expect(result.canSubmit).toBe(false)
    expect(result.reason).toBe('Profile not found.')
  })

  it('blocks when testimonial already exists', async () => {
    setupMocks({ existing: { id: 't1' } })
    const result = await canSubmitTestimonial('user-1')
    expect(result.canSubmit).toBe(false)
    expect(result.reason).toBe('You have already submitted a testimonial.')
  })

  it('blocks when no completed trade', async () => {
    setupMocks({ trade: null })
    const result = await canSubmitTestimonial('user-1')
    expect(result.canSubmit).toBe(false)
    expect(result.reason).toBe('Complete a trade before submitting a testimonial.')
  })
})
