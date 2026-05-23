import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GiftPremiumCTA } from '@/components/landing/GiftPremiumCTA'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

describe('GiftPremiumCTA', () => {
  beforeEach(() => {
    mockCapture.mockClear()
  })

  it('renders heading, description, and feature list', () => {
    render(<GiftPremiumCTA isAuthed={false} />)

    expect(screen.getByText('Give the gift of Premium')).toBeInTheDocument()
    expect(
      screen.getByText(/Know someone who'd love Barterkin/)
    ).toBeInTheDocument()
    expect(screen.getByText('100 contacts')).toBeInTheDocument()
    expect(screen.getByText('Unlimited listings')).toBeInTheDocument()
    expect(screen.getByText('Verified badge')).toBeInTheDocument()
  })

  it('renders the Gift Premium CTA button with correct href', () => {
    render(<GiftPremiumCTA isAuthed={false} />)

    const link = screen.getByRole('link', { name: /Gift Premium/i })
    expect(link).toHaveAttribute('href', '/gift/redeem?source=landing')
  })

  it('fires landing_gift_premium_cta_clicked with is_authed=false when unauthenticated user clicks', () => {
    render(<GiftPremiumCTA isAuthed={false} />)

    const link = screen.getByRole('link', { name: /Gift Premium/i })
    fireEvent.click(link)

    expect(mockCapture).toHaveBeenCalledTimes(1)
    expect(mockCapture).toHaveBeenCalledWith('landing_gift_premium_cta_clicked', {
      is_authed: false,
    })
  })

  it('fires landing_gift_premium_cta_clicked with is_authed=true when authenticated user clicks', () => {
    render(<GiftPremiumCTA isAuthed={true} />)

    const link = screen.getByRole('link', { name: /Gift Premium/i })
    fireEvent.click(link)

    expect(mockCapture).toHaveBeenCalledTimes(1)
    expect(mockCapture).toHaveBeenCalledWith('landing_gift_premium_cta_clicked', {
      is_authed: true,
    })
  })
})
