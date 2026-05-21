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

describe('getCountyStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockFrom.mockReset()
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

  it('returns all 159 Georgia counties with zero counts when no data', async () => {
    mockFrom
      .mockReturnValueOnce(mockProfilesChain([]))
      .mockReturnValueOnce(mockListingsChain([]))

    const { getCountyStats } = await import('@/lib/data/counties-public')
    const result = await getCountyStats()

    expect(result.counties).toHaveLength(159)
    expect(result.totalMembers).toBe(0)
    expect(result.totalListings).toBe(0)
    expect(result.error).toBeNull()
    expect(result.counties[0].name).toBe('Appling County')
    expect(result.counties[158].name).toBe('Worth County')
  })

  it('aggregates member and listing counts by county', async () => {
    mockFrom
      .mockReturnValueOnce(
        mockProfilesChain([
          { county_id: 13001 },
          { county_id: 13001 },
          { county_id: 13121 },
        ]),
      )
      .mockReturnValueOnce(
        mockListingsChain([
          { county_id: 13001 },
          { county_id: 13121 },
          { county_id: 13121 },
        ]),
      )

    const { getCountyStats } = await import('@/lib/data/counties-public')
    const result = await getCountyStats()

    const appling = result.counties.find((c) => c.fips === 13001)
    const fulton = result.counties.find((c) => c.fips === 13121)

    expect(appling?.memberCount).toBe(2)
    expect(appling?.listingCount).toBe(1)
    expect(fulton?.memberCount).toBe(1)
    expect(fulton?.listingCount).toBe(2)
    expect(result.totalMembers).toBe(3)
    expect(result.totalListings).toBe(3)
  })

  it('returns error when profiles query fails', async () => {
    mockFrom
      .mockReturnValueOnce(
        mockProfilesChain(null, { code: '42P01', message: 'relation does not exist' }),
      )
      .mockReturnValueOnce(mockListingsChain([]))

    const { getCountyStats } = await import('@/lib/data/counties-public')
    const result = await getCountyStats()

    expect(result.error).toBe('profiles_failed')
    expect(result.counties).toHaveLength(0)
  })

  it('returns error when listings query fails', async () => {
    mockFrom
      .mockReturnValueOnce(mockProfilesChain([]))
      .mockReturnValueOnce(
        mockListingsChain(null, { code: '42P01', message: 'relation does not exist' }),
      )

    const { getCountyStats } = await import('@/lib/data/counties-public')
    const result = await getCountyStats()

    expect(result.error).toBe('listings_failed')
    expect(result.counties).toHaveLength(0)
  })

  it('handles profiles with null county_id gracefully', async () => {
    mockFrom
      .mockReturnValueOnce(
        mockProfilesChain([
          { county_id: 13001 },
          { county_id: null },
          { county_id: 13001 },
        ]),
      )
      .mockReturnValueOnce(mockListingsChain([]))

    const { getCountyStats } = await import('@/lib/data/counties-public')
    const result = await getCountyStats()

    const appling = result.counties.find((c) => c.fips === 13001)
    expect(appling?.memberCount).toBe(2)
    expect(result.totalMembers).toBe(2)
  })
})
