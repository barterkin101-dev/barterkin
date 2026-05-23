import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ListingRow } from '@/lib/data/listings.types'

const mockGetListingById = vi.fn()

vi.mock('@/lib/data/listings', () => ({
  getListingById: (...args: unknown[]) => mockGetListingById(...args),
}))

vi.mock('next/headers', () => ({
  cookies: () => ({}),
}))

function makeListing(overrides: Partial<ListingRow> = {}): ListingRow {
  return {
    id: 'test-id',
    profile_id: 'prof-1',
    title: 'Vintage Guitar',
    description: 'A beautiful 1960s acoustic guitar.',
    condition: 'good',
    trade_terms: 'Willing to trade for piano lessons.',
    price_estimate: '$500',
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    featured_until: null,
    boosted_until: null,
    images: [
      { id: 'img-1', url: 'https://example.com/guitar.jpg', sort_order: 0 },
    ],
    profiles: {
      id: 'prof-1',
      display_name: 'Alice',
      username: 'alice123',
      avatar_url: 'https://example.com/alice.jpg',
      accepting_contact: true,
    },
    counties: { name: 'Fulton' },
    categories: { name: 'Music' },
    category_id: 1,
    county_id: 131,
    ...overrides,
  }
}

describe('PublicListingPage', () => {
  beforeEach(() => {
    mockGetListingById.mockReset()
  })

  it('renders listing title and description without auth', async () => {
    const listing = makeListing()
    mockGetListingById.mockResolvedValue(listing)

    const { default: PublicListingPage } = await import('@/app/listings/[id]/page')
    const element = await PublicListingPage({ params: Promise.resolve({ id: 'test-id' }) })
    render(element)

    expect(screen.getByRole('heading', { name: /vintage guitar/i })).toBeInTheDocument()
    expect(screen.getByText(/beautiful 1960s acoustic guitar/i)).toBeInTheDocument()
  })

  it('renders login CTA for unauthenticated visitors', async () => {
    const listing = makeListing()
    mockGetListingById.mockResolvedValue(listing)

    const { default: PublicListingPage } = await import('@/app/listings/[id]/page')
    const element = await PublicListingPage({ params: Promise.resolve({ id: 'test-id' }) })
    render(element)

    expect(screen.getByRole('link', { name: /log in to message/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
  })

  it('renders share actions', async () => {
    const listing = makeListing()
    mockGetListingById.mockResolvedValue(listing)

    const { default: PublicListingPage } = await import('@/app/listings/[id]/page')
    const element = await PublicListingPage({ params: Promise.resolve({ id: 'test-id' }) })
    render(element)

    expect(screen.getByText(/share this listing/i)).toBeInTheDocument()
  })

  it('renders seller profile card', async () => {
    const listing = makeListing()
    mockGetListingById.mockResolvedValue(listing)

    const { default: PublicListingPage } = await import('@/app/listings/[id]/page')
    const element = await PublicListingPage({ params: Promise.resolve({ id: 'test-id' }) })
    render(element)

    expect(screen.getByText(/alice/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view profile/i })).toBeInTheDocument()
  })

  it('renders 404 for non-existent listing', async () => {
    mockGetListingById.mockResolvedValue(null)

    const { default: PublicListingPage } = await import('@/app/listings/[id]/page')
    await expect(
      PublicListingPage({ params: Promise.resolve({ id: 'nonexistent' }) }),
    ).rejects.toThrow(/404/)
  })

  it('renders condition badge', async () => {
    const listing = makeListing({ condition: 'like-new' })
    mockGetListingById.mockResolvedValue(listing)

    const { default: PublicListingPage } = await import('@/app/listings/[id]/page')
    const element = await PublicListingPage({ params: Promise.resolve({ id: 'test-id' }) })
    render(element)

    expect(screen.getByText(/like new/i)).toBeInTheDocument()
  })

  it('renders category badge', async () => {
    const listing = makeListing({ categories: { name: 'Electronics' } })
    mockGetListingById.mockResolvedValue(listing)

    const { default: PublicListingPage } = await import('@/app/listings/[id]/page')
    const element = await PublicListingPage({ params: Promise.resolve({ id: 'test-id' }) })
    render(element)

    expect(screen.getByText(/electronics/i)).toBeInTheDocument()
  })
})
