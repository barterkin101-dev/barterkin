import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ListingFeaturePanel } from '@/components/listings/ListingFeaturePanel'

vi.mock('@/components/listings/FeatureListingButton', () => ({
  FeatureListingButton: ({ listingId }: { listingId: string }) => (
    <div data-testid="feature-button">{listingId}</div>
  ),
}))

describe('ListingFeaturePanel', () => {
  it('renders the panel for premium members', () => {
    render(
      <ListingFeaturePanel
        listingId="listing-1"
        tier="premium"
        credits={7}
        featuredUntil={null}
      />,
    )

    expect(screen.getByText('Promotion')).toBeInTheDocument()
    expect(screen.getByText(/spend 5 credits to pin this listing higher/i)).toBeInTheDocument()
    expect(screen.getByText(/you currently have 7 credits/i)).toBeInTheDocument()
    expect(screen.getByTestId('feature-button')).toHaveTextContent('listing-1')
  })

  it('hides the panel for non-premium members', () => {
    const { container } = render(
      <ListingFeaturePanel
        listingId="listing-1"
        tier="free"
        credits={20}
        featuredUntil={null}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
