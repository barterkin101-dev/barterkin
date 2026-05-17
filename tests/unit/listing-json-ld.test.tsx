import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ListingJsonLd } from '@/components/seo/ListingJsonLd'
import type { ListingRow } from '@/lib/data/listings.types'

const TEST_SITE_URL = 'https://www.barterkin.com'

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

describe('ListingJsonLd', () => {
  it('renders a script tag with type application/ld+json', () => {
    const listing = makeListing()
    const { container } = render(<ListingJsonLd listing={listing} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
  })

  it('outputs valid Product schema with required fields', () => {
    const listing = makeListing()
    const { container } = render(<ListingJsonLd listing={listing} />)
    const script = container.querySelector('script[type="application/ld+json"]')!
    const data = JSON.parse(script.textContent!)

    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toBe('Product')
    expect(data.name).toBe('Vintage Guitar')
    expect(data.description).toBe('A beautiful 1960s acoustic guitar.')
    expect(data.image).toEqual(['https://example.com/guitar.jpg'])
    expect(data.category).toBe('Music')
    expect(data.datePosted).toBe('2024-01-15T10:00:00Z')
    expect(data.url).toContain('/listings/test-id')
  })

  it('includes Offer with $0 price and InStock for active listings', () => {
    const listing = makeListing()
    const { container } = render(<ListingJsonLd listing={listing} />)
    const script = container.querySelector('script[type="application/ld+json"]')!
    const data = JSON.parse(script.textContent!)

    expect(data.offers['@type']).toBe('Offer')
    expect(data.offers.price).toBe('0')
    expect(data.offers.priceCurrency).toBe('USD')
    expect(data.offers.availability).toBe('https://schema.org/InStock')
    expect(data.offers.seller['@type']).toBe('Person')
    expect(data.offers.seller.name).toBe('Alice')
  })

  it('sets OutOfStock for inactive listings', () => {
    const listing = makeListing({ status: 'completed' })
    const { container } = render(<ListingJsonLd listing={listing} />)
    const script = container.querySelector('script[type="application/ld+json"]')!
    const data = JSON.parse(script.textContent!)

    expect(data.offers.availability).toBe('https://schema.org/OutOfStock')
  })

  it('maps condition to schema.org itemCondition', () => {
    const good = makeListing({ condition: 'good' })
    const { container: c1 } = render(<ListingJsonLd listing={good} />)
    expect(JSON.parse(c1.querySelector('script')!.textContent!).itemCondition).toBe('https://schema.org/UsedCondition')

    const likeNew = makeListing({ condition: 'like-new' })
    const { container: c2 } = render(<ListingJsonLd listing={likeNew} />)
    expect(JSON.parse(c2.querySelector('script')!.textContent!).itemCondition).toBe('https://schema.org/NewCondition')

    const newItem = makeListing({ condition: 'new' })
    const { container: c3 } = render(<ListingJsonLd listing={newItem} />)
    expect(JSON.parse(c3.querySelector('script')!.textContent!).itemCondition).toBe('https://schema.org/NewCondition')

    const forParts = makeListing({ condition: 'for-parts' })
    const { container: c4 } = render(<ListingJsonLd listing={forParts} />)
    expect(JSON.parse(c4.querySelector('script')!.textContent!).itemCondition).toBe('https://schema.org/DamagedCondition')
  })

  it('omits itemCondition when condition is null', () => {
    const listing = makeListing({ condition: null })
    const { container } = render(<ListingJsonLd listing={listing} />)
    const data = JSON.parse(container.querySelector('script')!.textContent!)
    expect(data.itemCondition).toBeUndefined()
  })

  it('falls back to OG image when no listing images', async () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL
    process.env.NEXT_PUBLIC_SITE_URL = TEST_SITE_URL
    vi.resetModules()
    const { ListingJsonLd: DynamicListingJsonLd } = await import('@/components/seo/ListingJsonLd')
    const listing = makeListing({ images: [] })
    const { container } = render(<DynamicListingJsonLd listing={listing} />)
    const data = JSON.parse(container.querySelector('script')!.textContent!)
    expect(data.image).toEqual([`${TEST_SITE_URL}/opengraph-image`])
    process.env.NEXT_PUBLIC_SITE_URL = original
  })

  it('includes areaServed as Georgia', () => {
    const listing = makeListing()
    const { container } = render(<ListingJsonLd listing={listing} />)
    const data = JSON.parse(container.querySelector('script')!.textContent!)
    expect(data.areaServed['@type']).toBe('State')
    expect(data.areaServed.name).toBe('Georgia')
  })

  it('strips undefined values from output', () => {
    const listing = makeListing({ profiles: null })
    const { container } = render(<ListingJsonLd listing={listing} />)
    const data = JSON.parse(container.querySelector('script')!.textContent!)
    // seller.url should not be present when no profile username
    expect(data.offers.seller.url).toBeUndefined()
  })

  it('computes deterministic priceValidUntil from created_at + 90 days', () => {
    const listing = makeListing({ created_at: '2024-01-15T10:00:00Z' })
    const { container } = render(<ListingJsonLd listing={listing} />)
    const data = JSON.parse(container.querySelector('script')!.textContent!)
    // 2024-01-15 + 90 days = 2024-04-14
    expect(data.offers.priceValidUntil).toBe('2024-04-14')
  })
})
