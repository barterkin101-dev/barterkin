import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PremiumPreviewToggle } from '@/components/listings/PremiumPreviewToggle'
import { getPremiumPreviewProps } from '@/lib/premium-preview'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

describe('getPremiumPreviewProps', () => {
  it('returns showToggle=true for free tier', () => {
    expect(getPremiumPreviewProps('free')).toEqual({ showToggle: true })
  })

  it('returns showToggle=false for premium tier', () => {
    expect(getPremiumPreviewProps('premium')).toEqual({ showToggle: false })
  })

  it('returns showToggle=false for founding tier', () => {
    expect(getPremiumPreviewProps('founding')).toEqual({ showToggle: false })
  })

  it('returns showToggle=false for null/undefined tier', () => {
    expect(getPremiumPreviewProps(null)).toEqual({ showToggle: false })
    expect(getPremiumPreviewProps(undefined)).toEqual({ showToggle: false })
  })
})

describe('PremiumPreviewToggle', () => {
  beforeEach(() => {
    mockCapture.mockReset()
  })

  it('renders toggle in off state by default', () => {
    render(<PremiumPreviewToggle listingId="listing-1" />)
    expect(screen.getByTestId('premium-preview-toggle')).toBeInTheDocument()
    expect(screen.getByText('Preview Premium')).toBeInTheDocument()
    expect(screen.getByRole('switch')).not.toBeChecked()
  })

  it('tracks impression on mount', () => {
    render(<PremiumPreviewToggle listingId="listing-1" />)
    expect(mockCapture).toHaveBeenCalledWith('premium_preview_banner_impression', {
      listing_id: 'listing-1',
    })
  })

  it('toggles preview on and tracks event', async () => {
    const user = userEvent.setup()
    render(<PremiumPreviewToggle listingId="listing-1" />)

    const switchEl = screen.getByRole('switch')
    await user.click(switchEl)

    expect(switchEl).toBeChecked()
    expect(screen.getByText('Premium preview on')).toBeInTheDocument()
    expect(screen.getByTestId('premium-preview-content')).toBeInTheDocument()
    expect(mockCapture).toHaveBeenCalledWith('premium_preview_toggled', {
      listing_id: 'listing-1',
      preview_enabled: true,
    })
  })

  it('toggles preview off and tracks event', async () => {
    const user = userEvent.setup()
    render(<PremiumPreviewToggle listingId="listing-1" />)

    const switchEl = screen.getByRole('switch')
    await user.click(switchEl)
    expect(switchEl).toBeChecked()

    mockCapture.mockReset()
    await user.click(switchEl)

    expect(switchEl).not.toBeChecked()
    expect(screen.queryByTestId('premium-preview-content')).not.toBeInTheDocument()
    expect(mockCapture).toHaveBeenCalledWith('premium_preview_toggled', {
      listing_id: 'listing-1',
      preview_enabled: false,
    })
  })

  it('shows featured and verified badges when preview is on', async () => {
    const user = userEvent.setup()
    render(<PremiumPreviewToggle listingId="listing-1" />)

    await user.click(screen.getByRole('switch'))

    expect(screen.getByText('Featured')).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('shows upgrade CTA linking to billing page when preview is on', async () => {
    const user = userEvent.setup()
    render(<PremiumPreviewToggle listingId="listing-1" />)

    await user.click(screen.getByRole('switch'))

    const cta = screen.getByRole('link', { name: /upgrade to premium/i })
    expect(cta).toHaveAttribute('href', '/dashboard/billing')
  })

  it('tracks CTA click', async () => {
    const user = userEvent.setup()
    render(<PremiumPreviewToggle listingId="listing-1" />)

    await user.click(screen.getByRole('switch'))
    mockCapture.mockReset()

    const cta = screen.getByRole('link', { name: /upgrade to premium/i })
    await user.click(cta)

    expect(mockCapture).toHaveBeenCalledWith('premium_preview_cta_clicked', {
      listing_id: 'listing-1',
    })
  })
})
