import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
    }),
  ),
}))

vi.mock('@/lib/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  })),
}))

describe('debug getCountyStats 21', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  function mockProfilesChain(data: unknown, error: unknown = null) {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data, error }),
        })),
      })),
    }
  }

  function mockListingsChain(data: unknown, error: unknown = null) {
    return {
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data, error }),
      })),
    }
  }

  it('test 1', async () => {
    mockFrom
      .mockReturnValueOnce(mockProfilesChain([]))
      .mockReturnValueOnce(mockListingsChain([]))
    const { getCountyStats } = await import('@/lib/data/counties-public')
    await getCountyStats()
  })

  it('test 2: profiles fail', async () => {
    mockFrom
      .mockReturnValueOnce(mockProfilesChain(null, { code: '42P01' }))
      .mockReturnValueOnce(mockListingsChain([]))
    const { getCountyStats } = await import('@/lib/data/counties-public')
    await getCountyStats()
  })

  it('test 3: listings fail', async () => {
    mockFrom
      .mockReturnValueOnce(mockProfilesChain([]))
      .mockReturnValueOnce(mockListingsChain(null, { code: '42P01' }))
    const { getCountyStats } = await import('@/lib/data/counties-public')
    const result = await getCountyStats()
    console.log('test3 result:', result.error)
  })
})
