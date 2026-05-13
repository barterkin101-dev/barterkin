import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DiscoverFeedTabs } from '@/components/dashboard/DiscoverFeedTabs'
import type { ListingRow } from '@/lib/data/listings.types'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

function makeListing(overrides?: Partial<ListingRow>): ListingRow {
  return {
    id: 'l-1',
    profile_id: 'p-1',
    title: 'Test Listing',
    description: 'A test listing for unit tests.',
    condition: 'good',
    trade_terms: null,
    price_estimate: '$50',
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    boosted_until: null,
    images: [],
    profiles: {
      id: 'p-1',
      display_name: 'Test User',
      username: 'testuser',
      avatar_url: null,
      accepting_contact: true,
    },
    counties: { name: 'Fulton' },
    categories: { name: 'Services' },
    category_id: 1,
    county_id: 1,
    ...overrides,
  }
}

describe('DiscoverFeedTabs', () => {
  beforeEach(() => {
    mockCapture.mockClear()
  })

  it('defaults to "for-you" tab when listings exist', () => {
    render(
      <DiscoverFeedTabs
        forYouListings={[makeListing()]}
        latestListings={[makeListing({ id: 'l-2' })]}
        forYouError={null}
        latestError={null}
      />,
    )

    expect(screen.getByRole('tab', { name: /For You/i })).toHaveAttribute('data-state', 'active')
    expect(screen.getByText('Test Listing')).toBeInTheDocument()
  })

  it('defaults to "latest" tab when for-you is empty', () => {
    render(
      <DiscoverFeedTabs
        forYouListings={[]}
        latestListings={[makeListing({ id: 'l-2', title: 'Latest Item' })]}
        forYouError={null}
        latestError={null}
      />,
    )

    expect(screen.getByRole('tab', { name: /Latest/i })).toHaveAttribute('data-state', 'active')
    expect(screen.getByText('Latest Item')).toBeInTheDocument()
  })

  it('tracks tab switch to "latest" once via PostHog', async () => {
    render(
      <DiscoverFeedTabs
        forYouListings={[makeListing()]}
        latestListings={[makeListing({ id: 'l-2' })]}
        forYouError={null}
        latestError={null}
      />,
    )

    const latestTab = screen.getByRole('tab', { name: /Latest/i })
    await userEvent.click(latestTab)

    expect(mockCapture).toHaveBeenCalledTimes(1)
    expect(mockCapture).toHaveBeenCalledWith('discover_tab_switched', {
      tab: 'latest',
      for_you_count: 1,
      latest_count: 1,
    })
  })

  it('deduplicates tracking — only fires once per tab', async () => {
    render(
      <DiscoverFeedTabs
        forYouListings={[makeListing()]}
        latestListings={[makeListing({ id: 'l-2' })]}
        forYouError={null}
        latestError={null}
      />,
    )

    const latestTab = screen.getByRole('tab', { name: /Latest/i })
    await userEvent.click(latestTab)
    await userEvent.click(latestTab)
    await userEvent.click(latestTab)

    expect(mockCapture).toHaveBeenCalledTimes(1)
  })

  it('tracks both tab switches (for-you → latest → for-you)', async () => {
    render(
      <DiscoverFeedTabs
        forYouListings={[makeListing()]}
        latestListings={[makeListing({ id: 'l-2' })]}
        forYouError={null}
        latestError={null}
      />,
    )

    const latestTab = screen.getByRole('tab', { name: /Latest/i })
    const forYouTab = screen.getByRole('tab', { name: /For You/i })

    await userEvent.click(latestTab)
    await userEvent.click(forYouTab)

    expect(mockCapture).toHaveBeenCalledTimes(2)
    expect(mockCapture).toHaveBeenNthCalledWith(1, 'discover_tab_switched', {
      tab: 'latest',
      for_you_count: 1,
      latest_count: 1,
    })
    expect(mockCapture).toHaveBeenNthCalledWith(2, 'discover_tab_switched', {
      tab: 'for-you',
      for_you_count: 1,
      latest_count: 1,
    })
  })

  it('shows error state when for-you fails', async () => {
    render(
      <DiscoverFeedTabs
        forYouListings={[]}
        latestListings={[makeListing({ id: 'l-2' })]}
        forYouError="discover_failed"
        latestError={null}
      />,
    )

    // Default tab is "latest" because for-you is empty, so switch to for-you
    const forYouTab = screen.getByRole('tab', { name: /For You/i })
    await userEvent.click(forYouTab)

    expect(
      screen.getByText(/Something went wrong loading personalized recommendations/i),
    ).toBeInTheDocument()
  })

  it('shows empty state when both tabs have no listings', async () => {
    render(
      <DiscoverFeedTabs
        forYouListings={[]}
        latestListings={[]}
        forYouError={null}
        latestError={null}
      />,
    )

    // Default tab is "latest" when for-you is empty; latest is also empty
    expect(screen.getByText(/No listings yet/i)).toBeInTheDocument()

    // Switch to for-you to see its empty state
    const forYouTab = screen.getByRole('tab', { name: /For You/i })
    await userEvent.click(forYouTab)

    expect(screen.getByText(/No personalized recommendations yet/i)).toBeInTheDocument()
  })

  it('shows latest empty state', async () => {
    render(
      <DiscoverFeedTabs
        forYouListings={[makeListing()]}
        latestListings={[]}
        forYouError={null}
        latestError={null}
      />,
    )

    const latestTab = screen.getByRole('tab', { name: /Latest/i })
    await userEvent.click(latestTab)

    expect(screen.getByText(/No listings yet/i)).toBeInTheDocument()
  })
})
