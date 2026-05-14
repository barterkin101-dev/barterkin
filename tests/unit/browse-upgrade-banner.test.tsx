import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowseUpgradeBanner } from '@/components/browse/BrowseUpgradeBanner'
import { getBrowseUpgradeBannerProps } from '@/lib/browse-upgrade-banner'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

describe('getBrowseUpgradeBannerProps', () => {
  it('returns banner props for free members who are at the monthly contact cap', () => {
    const result = getBrowseUpgradeBannerProps('directory', 'free', {
      used: 10,
      limit: 10,
      remaining: 0,
      isNearLimit: false,
      isAtLimit: true,
    })

    expect(result).toMatchObject({
      placement: 'directory',
      used: 10,
      limit: 10,
      premiumMonthlyPrice: '$9',
      premiumAnnualSavings: '$18',
      premiumContactLimit: 100,
      extraContactCapacity: 90,
      extraContactCostPerSlot: '$0.10',
    })
  })

  it('hides the banner for free members below the hard cap', () => {
    expect(getBrowseUpgradeBannerProps('directory', 'free', {
      used: 9,
      limit: 10,
      remaining: 1,
      isNearLimit: true,
      isAtLimit: false,
    })).toBeNull()
  })

  it('hides the banner for paid members', () => {
    expect(getBrowseUpgradeBannerProps('listings', 'premium', {
      used: 10,
      limit: 100,
      remaining: 90,
      isNearLimit: false,
      isAtLimit: false,
    })).toBeNull()
  })
})

describe('BrowseUpgradeBanner', () => {
  beforeEach(() => {
    mockCapture.mockReset()
  })

  it('renders the billing CTA and tracks impression and click events', async () => {
    const user = userEvent.setup()
    render(
      <BrowseUpgradeBanner
        placement="listings"
        used={10}
        limit={10}
        premiumMonthlyPrice="$9"
        premiumAnnualSavings="$18"
        premiumContactLimit={100}
        extraContactCapacity={90}
        extraContactCostPerSlot="$0.10"
      />,
    )

    expect(screen.getByText("You've used all 10/10 free contact starts this month.")).toBeInTheDocument()
    const cta = screen.getByRole('link', { name: /see premium plans/i })
    expect(cta).toHaveAttribute('href', '/dashboard/billing')

    expect(mockCapture).toHaveBeenCalledWith('contact_limit_upgrade_banner_impression', expect.objectContaining({
      placement: 'listings',
      used: 10,
      limit: 10,
    }))

    await user.click(cta)

    expect(mockCapture).toHaveBeenCalledWith('contact_limit_upgrade_banner_clicked', expect.objectContaining({
      placement: 'listings',
      used: 10,
      limit: 10,
    }))
  })
})
