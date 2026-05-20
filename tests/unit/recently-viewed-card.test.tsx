import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecentlyViewedCard } from '@/components/dashboard/RecentlyViewedCard'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

describe('RecentlyViewedCard', () => {
  beforeEach(() => {
    mockCapture.mockClear()
  })

  it('renders nothing when views array is empty', () => {
    const { container } = render(<RecentlyViewedCard views={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders listing title, category, county, and image', () => {
    const views = [
      {
        id: 'view-1',
        profile_id: 'profile-1',
        listing_id: 'listing-1',
        viewed_at: '2026-05-20T10:00:00Z',
        listings: {
          id: 'listing-1',
          title: 'Vintage Guitar',
          description: null,
          condition: null,
          trade_terms: null,
          price_estimate: null,
          status: 'active',
          created_at: '2026-05-20T09:00:00Z',
          updated_at: '2026-05-20T09:00:00Z',
          featured_until: null,
          boosted_until: null,
          counties: { name: 'Fulton' },
          categories: { name: 'Music' },
          listing_images: [{ url: 'https://example.com/guitar.jpg' }],
          profiles: { id: 'owner-1', display_name: 'Alice', username: 'alice', avatar_url: null },
        },
      },
    ]
    render(<RecentlyViewedCard views={views as unknown as Parameters<typeof RecentlyViewedCard>[0]['views']} />)
    expect(screen.getByText('Vintage Guitar')).toBeInTheDocument()
    expect(screen.getByText('Music · Fulton')).toBeInTheDocument()
  })

  it('fires analytics event when a listing link is clicked', () => {
    const views = [
      {
        id: 'view-1',
        profile_id: 'profile-1',
        listing_id: 'listing-1',
        viewed_at: '2026-05-20T10:00:00Z',
        listings: {
          id: 'listing-1',
          title: 'Vintage Guitar',
          description: null,
          condition: null,
          trade_terms: null,
          price_estimate: null,
          status: 'active',
          created_at: '2026-05-20T09:00:00Z',
          updated_at: '2026-05-20T09:00:00Z',
          featured_until: null,
          boosted_until: null,
          counties: { name: 'Fulton' },
          categories: { name: 'Music' },
          listing_images: [{ url: 'https://example.com/guitar.jpg' }],
          profiles: { id: 'owner-1', display_name: 'Alice', username: 'alice', avatar_url: null },
        },
      },
    ]
    render(<RecentlyViewedCard views={views as unknown as Parameters<typeof RecentlyViewedCard>[0]['views']} />)
    const link = screen.getByRole('link')
    link.click()
    expect(mockCapture).toHaveBeenCalledWith('listing_revisited_from_dashboard', {
      listing_id: 'listing-1',
      viewed_at: '2026-05-20T10:00:00Z',
    })
  })
})
