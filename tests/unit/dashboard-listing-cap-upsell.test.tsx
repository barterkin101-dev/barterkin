import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ListingCapUpsell } from '@/components/dashboard/ListingCapUpsell'
import { getDashboardListingCapUpsellProps } from '@/lib/dashboard-listing-cap-upsell'
import type { ListingRow } from '@/lib/data/listings.types'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

function makeListing(status: string): ListingRow {
  return {
    id: crypto.randomUUID(),
    profile_id: 'profile-1',
    title: 'Test listing',
    description: 'desc',
    condition: null,
    trade_terms: null,
    price_estimate: null,
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    featured_until: null,
    boosted_until: null,
    images: [],
    profiles: null,
    counties: null,
    categories: null,
    category_id: null,
    county_id: null,
  }
}

describe('getDashboardListingCapUpsellProps', () => {
  it('returns props when a free member is one listing away from the cap', () => {
    const result = getDashboardListingCapUpsellProps('free', [
      makeListing('active'),
      makeListing('paused'),
    ])

    expect(result).toMatchObject({
      used: 2,
      limit: 3,
      remaining: 1,
      premiumMonthlyPrice: '$9',
      premiumAnnualSavings: '$18',
    })
  })

  it('ignores cancelled listings when checking the cap', () => {
    expect(getDashboardListingCapUpsellProps('free', [
      makeListing('active'),
      makeListing('cancelled'),
    ])).toBeNull()
  })

  it('hides the nudge for paid members and free members not at the threshold', () => {
    expect(getDashboardListingCapUpsellProps('premium', [
      makeListing('active'),
      makeListing('active'),
    ])).toBeNull()

    expect(getDashboardListingCapUpsellProps('free', [
      makeListing('active'),
    ])).toBeNull()
  })
})

describe('ListingCapUpsell', () => {
  beforeEach(() => {
    mockCapture.mockReset()
  })

  it('renders the billing CTA and tracks impression and click events', async () => {
    const user = userEvent.setup()

    render(
      <ListingCapUpsell
        used={2}
        limit={3}
        remaining={1}
        premiumMonthlyPrice="$9"
        premiumAnnualSavings="$18"
      />,
    )

    expect(screen.getByText('Your next listing fills your free cap (2/3 used).')).toBeInTheDocument()
    expect(screen.getByText('You have 1 listing slot left. Upgrade to Premium from $9/mo to remove the cap before your next post. Annual billing saves $18.')).toBeInTheDocument()

    const cta = screen.getByRole('link', { name: /unlock unlimited listings/i })
    expect(cta).toHaveAttribute('href', '/dashboard/billing')

    expect(mockCapture).toHaveBeenCalledWith('listing_cap_upgrade_nudge_impression', expect.objectContaining({
      used: 2,
      limit: 3,
      remaining: 1,
    }))

    await user.click(cta)

    expect(mockCapture).toHaveBeenCalledWith('listing_cap_upgrade_nudge_clicked', expect.objectContaining({
      used: 2,
      limit: 3,
      remaining: 1,
    }))
  })
})
