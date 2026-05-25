import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ContactLimitUpsellModal } from '@/components/messaging/ContactLimitUpsellModal'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

describe('ContactLimitUpsellModal', () => {
  beforeEach(() => {
    mockCapture.mockClear()
  })

  it('renders the modal with correct copy when open', () => {
    render(
      <ContactLimitUpsellModal
        open={true}
        onOpenChange={() => {}}
        used={10}
        limit={10}
        premiumMonthlyPrice="$9"
        premiumAnnualSavings="$18"
        premiumContactLimit={100}
      />,
    )

    expect(screen.getByText("You've reached your contact limit")).toBeInTheDocument()
    expect(screen.getByText("Free members can start 10 conversations per month. You've used 10. Upgrade to Premium to unlock more trade opportunities.")).toBeInTheDocument()
    expect(screen.getByText('100 contacts per month (10x more)')).toBeInTheDocument()
    expect(screen.getByText('Unlimited listings')).toBeInTheDocument()
    expect(screen.getByText('Verified badge on your profile')).toBeInTheDocument()
    expect(screen.getByText('Featured placement in directory')).toBeInTheDocument()
    expect(screen.getByText('$9/mo')).toBeInTheDocument()
    expect(screen.getByText('Annual billing saves $18')).toBeInTheDocument()
  })

  it('tracks upsell_modal_clicked when upgrade button is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <ContactLimitUpsellModal
        open={true}
        onOpenChange={onOpenChange}
        used={10}
        limit={10}
        premiumMonthlyPrice="$9"
        premiumAnnualSavings="$18"
        premiumContactLimit={100}
      />,
    )

    const upgradeBtn = screen.getByRole('link', { name: /upgrade to premium/i })
    expect(upgradeBtn).toHaveAttribute('href', '/dashboard/billing')

    await user.click(upgradeBtn)

    expect(mockCapture).toHaveBeenCalledWith('contact_limit_upsell_clicked', expect.objectContaining({
      used: 10,
      limit: 10,
      premium_monthly_price: '$9',
      cta_location: 'upsell_modal',
    }))
  })

  it('tracks contact_limit_upsell_dismissed when maybe later is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <ContactLimitUpsellModal
        open={true}
        onOpenChange={onOpenChange}
        used={10}
        limit={10}
        premiumMonthlyPrice="$9"
        premiumAnnualSavings="$18"
        premiumContactLimit={100}
      />,
    )

    const dismissBtn = screen.getByRole('button', { name: /maybe later/i })
    await user.click(dismissBtn)

    expect(mockCapture).toHaveBeenCalledWith('contact_limit_upsell_dismissed', expect.objectContaining({
      used: 10,
      limit: 10,
      premium_monthly_price: '$9',
    }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not render when dismissed and closed', () => {
    const { container } = render(
      <ContactLimitUpsellModal
        open={false}
        onOpenChange={() => {}}
        used={10}
        limit={10}
        premiumMonthlyPrice="$9"
        premiumAnnualSavings="$18"
        premiumContactLimit={100}
      />,
    )

    expect(container.firstChild).toBeNull()
  })
})
