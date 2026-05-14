import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ContactLimitUpsell } from '@/components/dashboard/ContactLimitUpsell'
import { ContactLimitComparisonCard } from '@/components/dashboard/ContactLimitComparisonCard'

describe('ContactLimitUpsell', () => {
  it('renders the warning state for free members near the cap', () => {
    render(
      <ContactLimitUpsell
        used={7}
        limit={10}
        remaining={3}
        isAtLimit={false}
        premiumMonthlyPrice="$9"
        premiumAnnualSavings="$18"
      />,
    )

    expect(screen.getByText("You're approaching your monthly contact limit (7/10)")).toBeInTheDocument()
    expect(screen.getByText('You have 3 conversations left this month. Upgrade to Premium for $9/mo. Annual billing saves $18.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /upgrade to premium/i })).toHaveAttribute('href', '/dashboard/billing')
  })

  it('renders the hard-stop copy when the free cap is reached', () => {
    render(
      <ContactLimitUpsell
        used={10}
        limit={10}
        remaining={0}
        isAtLimit={true}
        premiumMonthlyPrice="$9"
        premiumAnnualSavings="$18"
      />,
    )

    expect(screen.getByText("You've reached your monthly contact limit")).toBeInTheDocument()
    expect(screen.getByText('Free members can start 10 conversations per month. Upgrade to Premium for $9/mo to unlock 100 contacts/mo and reach more traders. Annual billing saves $18.')).toBeInTheDocument()
  })
})

describe('ContactLimitComparisonCard', () => {
  it('renders the free vs premium contact limits with a billing CTA', () => {
    render(<ContactLimitComparisonCard />)

    expect(screen.getByText('Unlock more trade conversations')).toBeInTheDocument()
    expect(screen.getByText('Free members can start 10 conversations per month. Premium raises that to 100 contacts/mo.')).toBeInTheDocument()
    expect(screen.getByText('Free: 10/mo')).toBeInTheDocument()
    expect(screen.getByText('Premium: 100/mo')).toBeInTheDocument()
    expect(screen.getByText('Premium from $9/mo')).toBeInTheDocument()
    expect(screen.getByText('Save $18/year with annual billing')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /compare plans/i })).toHaveAttribute('href', '/dashboard/billing')
  })
})
