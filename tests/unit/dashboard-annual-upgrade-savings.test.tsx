import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnnualUpgradeSavingsCard } from '@/components/dashboard/AnnualUpgradeSavingsCard'
import { getDashboardAnnualUpgradeSavingsProps } from '@/lib/dashboard-annual-upgrade-savings'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

describe('getDashboardAnnualUpgradeSavingsProps', () => {
  it('returns props for monthly premium members', () => {
    expect(getDashboardAnnualUpgradeSavingsProps('premium', 'monthly')).toMatchObject({
      premiumMonthlyPrice: '$9',
      premiumAnnualPrice: '$90',
      premiumAnnualSavings: '$18',
      annualEquivalentPrice: '$7.50',
    })
  })

  it('hides the card for free, founding, and annual premium members', () => {
    expect(getDashboardAnnualUpgradeSavingsProps('free', 'monthly')).toBeNull()
    expect(getDashboardAnnualUpgradeSavingsProps('founding', 'monthly')).toBeNull()
    expect(getDashboardAnnualUpgradeSavingsProps('premium', 'annual')).toBeNull()
    expect(getDashboardAnnualUpgradeSavingsProps('premium', null)).toBeNull()
  })
})

describe('AnnualUpgradeSavingsCard', () => {
  beforeEach(() => {
    mockCapture.mockReset()
  })

  it('renders annual savings copy and tracks impression and click events', async () => {
    const user = userEvent.setup()

    render(
      <AnnualUpgradeSavingsCard
        premiumMonthlyPrice="$9"
        premiumAnnualPrice="$90"
        premiumAnnualSavings="$18"
        annualEquivalentPrice="$7.50"
      />,
    )

    expect(screen.getByText('Switch to annual Premium and keep the same perks for less.')).toBeInTheDocument()
    expect(screen.getByText("You're paying $9/month today. Annual Premium is $90/year, works out to $7.50/month, and saves $18 per year.")).toBeInTheDocument()

    const cta = screen.getByRole('link', { name: /view annual upgrade/i })
    expect(cta).toHaveAttribute('href', '/dashboard/billing')

    expect(mockCapture).toHaveBeenCalledWith('annual_upgrade_savings_card_impression', expect.objectContaining({
      premium_monthly_price: '$9',
      premium_annual_price: '$90',
      premium_annual_savings: '$18',
      annual_equivalent_price: '$7.50',
    }))

    await user.click(cta)

    expect(mockCapture).toHaveBeenCalledWith('annual_upgrade_savings_card_clicked', expect.objectContaining({
      premium_monthly_price: '$9',
      premium_annual_price: '$90',
      premium_annual_savings: '$18',
      annual_equivalent_price: '$7.50',
    }))
  })
})
