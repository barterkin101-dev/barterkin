import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FoundingMemberNudge } from '@/components/dashboard/FoundingMemberNudge'

const FOUNDING_MONTHLY_CENTS = 500
const PREMIUM_MONTHLY_CENTS = 900
const PREMIUM_ANNUAL_CENTS = 9000

describe('FoundingMemberNudge', () => {
  it('renders urgent state when slots remaining <= 10', () => {
    render(
      <FoundingMemberNudge
        slotsRemaining={5}
        foundingMonthlyCents={FOUNDING_MONTHLY_CENTS}
        premiumMonthlyCents={PREMIUM_MONTHLY_CENTS}
        premiumAnnualCents={PREMIUM_ANNUAL_CENTS}
      />,
    )
    expect(screen.getByText(/Almost gone/)).toBeInTheDocument()
    expect(screen.getByText(/5 founding slots left/)).toBeInTheDocument()
  })

  it('renders non-urgent state when slots remaining > 10', () => {
    render(
      <FoundingMemberNudge
        slotsRemaining={25}
        foundingMonthlyCents={FOUNDING_MONTHLY_CENTS}
        premiumMonthlyCents={PREMIUM_MONTHLY_CENTS}
        premiumAnnualCents={PREMIUM_ANNUAL_CENTS}
      />,
    )
    expect(screen.queryByText(/Almost gone/)).not.toBeInTheDocument()
    expect(screen.getByText(/25 founding slots left/)).toBeInTheDocument()
  })

  it('shows live pricing and both premium savings comparisons', () => {
    render(
      <FoundingMemberNudge
        slotsRemaining={15}
        foundingMonthlyCents={FOUNDING_MONTHLY_CENTS}
        premiumMonthlyCents={PREMIUM_MONTHLY_CENTS}
        premiumAnnualCents={PREMIUM_ANNUAL_CENTS}
      />,
    )
    expect(screen.getByText(/\$5\/month/)).toBeInTheDocument()
    expect(screen.getByText(/\$60 a year/)).toBeInTheDocument()
    expect(screen.getByText(/saves \$48 versus Premium Monthly and \$30 versus Premium Annual/)).toBeInTheDocument()
  })

  it('shows singular slot when one remains', () => {
    render(
      <FoundingMemberNudge
        slotsRemaining={1}
        foundingMonthlyCents={FOUNDING_MONTHLY_CENTS}
        premiumMonthlyCents={PREMIUM_MONTHLY_CENTS}
        premiumAnnualCents={PREMIUM_ANNUAL_CENTS}
      />,
    )
    expect(screen.getByText(/1 founding slot left/)).toBeInTheDocument()
  })

  it('renders the claim CTA linking to billing', () => {
    render(
      <FoundingMemberNudge
        slotsRemaining={10}
        foundingMonthlyCents={FOUNDING_MONTHLY_CENTS}
        premiumMonthlyCents={PREMIUM_MONTHLY_CENTS}
        premiumAnnualCents={PREMIUM_ANNUAL_CENTS}
      />,
    )
    const cta = screen.getByRole('link', { name: /Claim now/ })
    expect(cta).toHaveAttribute('href', '/dashboard/billing')
  })

  it('shows progress bar with correct percentage', () => {
    render(
      <FoundingMemberNudge
        slotsRemaining={75}
        foundingMonthlyCents={FOUNDING_MONTHLY_CENTS}
        premiumMonthlyCents={PREMIUM_MONTHLY_CENTS}
        premiumAnnualCents={PREMIUM_ANNUAL_CENTS}
      />,
    )
    expect(screen.getByText(/25 claimed/)).toBeInTheDocument()
    expect(screen.getByText(/100 total/)).toBeInTheDocument()
  })

  it('omits negative savings comparisons', () => {
    render(
      <FoundingMemberNudge
        slotsRemaining={8}
        foundingMonthlyCents={1000}
        premiumMonthlyCents={900}
        premiumAnnualCents={9000}
      />,
    )

    expect(screen.getByText(/Lock in Premium forever at \$10\/month for \$120 a year\./)).toBeInTheDocument()
    expect(screen.queryByText(/That saves/)).not.toBeInTheDocument()
    expect(screen.getByText(/Exclusive founding member badge on your profile\./)).toBeInTheDocument()
  })

  it('shows only positive savings comparisons when annual pricing is lower', () => {
    render(
      <FoundingMemberNudge
        slotsRemaining={12}
        foundingMonthlyCents={700}
        premiumMonthlyCents={900}
        premiumAnnualCents={8000}
      />,
    )

    expect(screen.getByText(/That saves \$24 versus Premium Monthly\./)).toBeInTheDocument()
    expect(screen.queryByText(/Premium Annual/)).not.toBeInTheDocument()
  })
})
