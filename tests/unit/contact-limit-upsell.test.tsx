import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ContactLimitUpsell } from '@/components/dashboard/ContactLimitUpsell'

describe('ContactLimitUpsell', () => {
  it('renders the warning state for free members near the cap', () => {
    render(
      <ContactLimitUpsell
        used={7}
        limit={10}
        remaining={3}
        isAtLimit={false}
      />,
    )

    expect(screen.getByText("You're approaching your monthly contact limit (7/10)")).toBeInTheDocument()
    expect(screen.getByText('You have 3 conversations left this month. Upgrade to Premium for 100 contacts/mo.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /upgrade to premium/i })).toHaveAttribute('href', '/dashboard/billing')
  })

  it('renders the hard-stop copy when the free cap is reached', () => {
    render(
      <ContactLimitUpsell
        used={10}
        limit={10}
        remaining={0}
        isAtLimit={true}
      />,
    )

    expect(screen.getByText("You've reached your monthly contact limit")).toBeInTheDocument()
    expect(screen.getByText('Free members can start 10 conversations per month. Upgrade to Premium to unlock 100 contacts/mo and reach more traders.')).toBeInTheDocument()
  })
})
