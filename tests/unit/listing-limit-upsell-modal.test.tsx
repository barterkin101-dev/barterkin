import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ListingLimitUpsellModal } from '@/components/listings/ListingLimitUpsellModal'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

describe('ListingLimitUpsellModal', () => {
  beforeEach(() => {
    mockCapture.mockClear()
  })

  it('renders the modal with correct copy when open', () => {
    render(
      <ListingLimitUpsellModal
        open={true}
        onOpenChange={() => {}}
        used={3}
        limit={3}
        premiumMonthlyPrice="$9"
        premiumAnnualSavings="$18"
      />,
    )

    expect(screen.getByText("You've reached your listing limit")).toBeInTheDocument()
    expect(screen.getByText('Free members can create up to 3 listings. You\'ve used 3. Upgrade to Premium for unlimited listings.')).toBeInTheDocument()
    expect(screen.getByText('Unlimited listings')).toBeInTheDocument()
    expect(screen.getByText('100 contacts per month')).toBeInTheDocument()
    expect(screen.getByText('Verified badge on your profile')).toBeInTheDocument()
    expect(screen.getByText('Featured placement in directory')).toBeInTheDocument()
    expect(screen.getByText('$9/mo')).toBeInTheDocument()
    expect(screen.getByText('Annual billing saves $18')).toBeInTheDocument()
  })

  it('tracks upsell_modal_clicked when upgrade button is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <ListingLimitUpsellModal
        open={true}
        onOpenChange={onOpenChange}
        used={3}
        limit={3}
        premiumMonthlyPrice="$9"
        premiumAnnualSavings="$18"
      />,
    )

    const upgradeBtn = screen.getByRole('link', { name: /upgrade to premium/i })
    expect(upgradeBtn).toHaveAttribute('href', '/dashboard/billing')

    await user.click(upgradeBtn)

    expect(mockCapture).toHaveBeenCalledWith('upsell_modal_clicked', expect.objectContaining({
      used: 3,
      limit: 3,
      premium_monthly_price: '$9',
      cta_location: 'upsell_modal',
      context: 'listing_limit',
    }))
  })

  it('tracks upsell_modal_dismissed when maybe later is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <ListingLimitUpsellModal
        open={true}
        onOpenChange={onOpenChange}
        used={3}
        limit={3}
        premiumMonthlyPrice="$9"
        premiumAnnualSavings="$18"
      />,
    )

    const dismissBtn = screen.getByRole('button', { name: /maybe later/i })
    await user.click(dismissBtn)

    expect(mockCapture).toHaveBeenCalledWith('upsell_modal_dismissed', expect.objectContaining({
      used: 3,
      limit: 3,
      premium_monthly_price: '$9',
      context: 'listing_limit',
    }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not render when dismissed and closed', () => {
    const { container } = render(
      <ListingLimitUpsellModal
        open={false}
        onOpenChange={() => {}}
        used={3}
        limit={3}
        premiumMonthlyPrice="$9"
        premiumAnnualSavings="$18"
      />,
    )

    // When open=false and dismissed, the component returns null
    expect(container.firstChild).toBeNull()
  })
})
