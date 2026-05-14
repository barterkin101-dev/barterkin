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

  it('shows live pricing and annual savings math', () => {
    render(
      <FoundingMemberNudge
        slotsRemaining={15}
        foundingMonthlyCents={FOUNDING_MONTHLY_CENTS}
        premiumMonthlyCents={PREMIUM_MONTHLY_CENTS}
        premiumAnnualCents={PREMIUM_ANNUAL_CENTS}
      />,
    )
    expect(screen.getByText(/\$5\/month/)).toBeInTheDocument()
    // Best savings vs premium: max((900*12)-6000, 9000-6000) = max(4800, 3000) cents = $48
    expect(screen.getByText(/save \$48 every year vs Premium/)).toBeInTheDocument()
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
})
