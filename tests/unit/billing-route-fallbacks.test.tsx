import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BillingError from '@/app/(app)/dashboard/billing/error'
import BillingLoading from '@/app/(app)/dashboard/billing/loading'

describe('dashboard billing route fallbacks', () => {
  it('renders the shared billing error state', () => {
    render(
      <BillingError
        error={new Error('boom')}
        reset={vi.fn()}
      />,
    )

    expect(screen.getByText("Couldn't load billing")).toBeInTheDocument()
    expect(screen.getByText('We could not load your billing information. Please try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
  })

  it('renders the billing loading skeletons', () => {
    const { container } = render(<BillingLoading />)

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(18)
  })
})
