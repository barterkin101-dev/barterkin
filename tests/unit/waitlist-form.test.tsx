import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockUseActionState } = vi.hoisted(() => ({
  mockUseActionState: vi.fn(),
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useActionState: mockUseActionState,
  }
})

vi.mock('@/lib/actions/waitlist', () => ({
  joinWaitlist: vi.fn(),
}))

import { WaitlistForm } from '@/components/landing/WaitlistForm'

describe('WaitlistForm', () => {
  beforeEach(() => {
    mockUseActionState.mockReset()
  })

  it('renders the server action error message', () => {
    mockUseActionState.mockReturnValue([
      { ok: false, error: 'Too many requests from this network. Please try again in a few minutes.' },
      vi.fn(),
      false,
    ])

    render(<WaitlistForm heroVariant="georgia_community_skills_exchange" />)

    expect(screen.getByRole('alert')).toHaveTextContent('Too many requests from this network')
  })

  it('renders the fallback success message when no confirmation email was sent', () => {
    mockUseActionState.mockReturnValue([{ ok: true, confirmationSent: false }, vi.fn(), false])

    render(<WaitlistForm heroVariant="trade_skills_neighbors_no_cash" />)

    expect(screen.getByText("You're on the waitlist! We'll be in touch soon.")).toBeInTheDocument()
  })

  it('includes the landing hero variant hidden field', () => {
    mockUseActionState.mockReturnValue([null, vi.fn(), false])

    render(<WaitlistForm heroVariant="trade_skills_neighbors_no_cash" />)

    expect(screen.getByDisplayValue('trade_skills_neighbors_no_cash')).toHaveAttribute(
      'name',
      'landingHeroVariant',
    )
  })
})
