import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}))

function setupSupabaseData() {
  const listings = [
    {
      id: 'listing-1',
      category_id: 1,
      county_id: 13001,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-12T00:00:00.000Z',
    },
    {
      id: 'listing-2',
      category_id: 1,
      county_id: 13001,
      created_at: '2026-05-02T00:00:00.000Z',
      updated_at: '2026-05-13T00:00:00.000Z',
    },
    ...Array.from({ length: 19 }, (_, index) => ({
      id: `listing-${index + 3}`,
      category_id: 1,
      county_id: 13001,
      created_at: '2026-05-03T00:00:00.000Z',
      updated_at: '2026-05-03T00:00:00.000Z',
    })),
    {
      id: 'listing-22',
      category_id: 2,
      county_id: 13003,
      created_at: '2026-05-04T00:00:00.000Z',
      updated_at: '2026-05-10T00:00:00.000Z',
    },
  ]

  const profiles = [
    {
      username: 'alice',
      category_id: 1,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-11T00:00:00.000Z',
    },
    {
      username: 'bob',
      category_id: 2,
      created_at: '2026-05-02T00:00:00.000Z',
      updated_at: '2026-05-14T00:00:00.000Z',
    },
    {
      username: null,
      category_id: 3,
      created_at: '2026-05-03T00:00:00.000Z',
      updated_at: '2026-05-15T00:00:00.000Z',
    },
  ]

  mockFrom.mockImplementation((table: string) => {
    if (table === 'listings') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: listings })),
        })),
      }
    }

    if (table === 'profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: profiles })),
          })),
        })),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('sitemap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSupabaseData()
    delete process.env.NEXT_PUBLIC_SITE_URL
  })

  it('includes grouped listing and directory URLs with pagination', async () => {
    const { default: sitemap } = await import('@/app/sitemap')
    const entries = await sitemap()

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: 'https://www.barterkin.com/listings/listing-1',
          lastModified: new Date('2026-05-12T00:00:00.000Z'),
        }),
        expect.objectContaining({
          url: 'https://www.barterkin.com/m/alice',
          lastModified: new Date('2026-05-11T00:00:00.000Z'),
        }),
        expect.objectContaining({
          url: 'https://www.barterkin.com/listings?page=2',
          lastModified: new Date('2026-05-13T00:00:00.000Z'),
        }),
        expect.objectContaining({
          url: 'https://www.barterkin.com/listings?category=1',
          lastModified: new Date('2026-05-13T00:00:00.000Z'),
        }),
        expect.objectContaining({
          url: 'https://www.barterkin.com/listings?category=1&page=2',
          lastModified: new Date('2026-05-13T00:00:00.000Z'),
        }),
        expect.objectContaining({
          url: 'https://www.barterkin.com/listings?county=13001',
          lastModified: new Date('2026-05-13T00:00:00.000Z'),
        }),
        expect.objectContaining({
          url: 'https://www.barterkin.com/listings?county=13001&page=2',
          lastModified: new Date('2026-05-13T00:00:00.000Z'),
        }),
        expect.objectContaining({
          url: 'https://www.barterkin.com/listings?county=13003',
          lastModified: new Date('2026-05-10T00:00:00.000Z'),
        }),
        expect.objectContaining({
          url: 'https://www.barterkin.com/directory?category=home-garden',
          lastModified: new Date('2026-05-11T00:00:00.000Z'),
        }),
        expect.objectContaining({
          url: 'https://www.barterkin.com/directory?category=food-kitchen',
          lastModified: new Date('2026-05-14T00:00:00.000Z'),
        }),
        expect.objectContaining({
          url: 'https://www.barterkin.com/directory?category=arts-crafts',
          lastModified: new Date('2026-05-15T00:00:00.000Z'),
        }),
      ]),
    )

    expect(entries.find((entry) => entry.url === 'https://www.barterkin.com/m/null')).toBeUndefined()
    expect(entries).toHaveLength(45)
  })
})
