import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitTestimonial } from '@/lib/actions/testimonials'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({ error: vi.fn() })),
}))

describe('submitTestimonial', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  })

  function setupMocks(overrides?: {
    profile?: { id: string } | null
    existing?: { id: string } | null
    trade?: { id: string } | null
    insertError?: { message: string; code: string } | null
  }) {
    const {
      profile = { id: 'prof-1' },
      existing = null,
      trade = { id: 'list-1' },
      insertError = null,
    } = overrides ?? {}

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
        }
      }
      if (table === 'testimonials') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
          insert: mockInsert.mockResolvedValue({ error: insertError }),
        }
      }
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: trade, error: null }),
        }
      }
      return {}
    })
  }

  it('submits testimonial successfully', async () => {
    setupMocks()
    const formData = new FormData()
    formData.set('quote', 'Barterkin changed my life!')
    formData.set('tradeContext', 'Plumbing for bread')

    const result = await submitTestimonial(null, formData)
    expect(result.ok).toBe(true)
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('auth error') })
    const formData = new FormData()
    formData.set('quote', 'Great!')

    const result = await submitTestimonial(null, formData)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Not authenticated.')
  })

  it('returns error when quote is too short', async () => {
    setupMocks()
    const formData = new FormData()
    formData.set('quote', 'Hi')

    const result = await submitTestimonial(null, formData)
    expect(result.ok).toBe(false)
    expect(result.fieldErrors).toBeDefined()
  })

  it('returns error when profile not found', async () => {
    setupMocks({ profile: null })
    const formData = new FormData()
    formData.set('quote', 'Barterkin changed my life!')

    const result = await submitTestimonial(null, formData)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Profile not found.')
  })

  it('returns error when testimonial already exists', async () => {
    setupMocks({ existing: { id: 't1' } })
    const formData = new FormData()
    formData.set('quote', 'Barterkin changed my life!')

    const result = await submitTestimonial(null, formData)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('You have already submitted a testimonial.')
  })

  it('returns error when no completed trade', async () => {
    setupMocks({ trade: null })
    const formData = new FormData()
    formData.set('quote', 'Barterkin changed my life!')

    const result = await submitTestimonial(null, formData)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Complete a trade before submitting a testimonial.')
  })

  it('returns error on insert failure', async () => {
    setupMocks({ insertError: { message: 'db error', code: '23505' } })
    const formData = new FormData()
    formData.set('quote', 'Barterkin changed my life!')

    const result = await submitTestimonial(null, formData)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Something went wrong submitting your testimonial.')
  })
})
