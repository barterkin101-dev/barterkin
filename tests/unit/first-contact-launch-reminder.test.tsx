import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FirstContactLaunchReminder } from '@/components/dashboard/FirstContactLaunchReminder'
import { buildSmsReferralShareUrl } from '@/lib/referral-share'

const mockCapture = vi.fn()
const mockOpen = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

describe('FirstContactLaunchReminder', () => {
  beforeEach(() => {
    mockCapture.mockClear()
    mockOpen.mockReset()

    Object.defineProperty(window, 'open', {
      configurable: true,
      writable: true,
      value: mockOpen,
    })
  })

  it('renders the main browse-members CTA', () => {
    render(
      <FirstContactLaunchReminder
        reminder={{
          href: '/directory',
          activeListingCount: 1,
          listingTitle: 'Vintage camera bundle',
          referralCode: null,
          referralLink: null,
          referralCount: 0,
          credits: 0,
        }}
      />,
    )

    expect(screen.getByRole('link', { name: /browse members/i })).toHaveAttribute('href', '/directory')
  })

  it('does not show the sms referral CTA without a referral link', () => {
    render(
      <FirstContactLaunchReminder
        reminder={{
          href: '/directory',
          activeListingCount: 1,
          listingTitle: 'Vintage camera bundle',
          referralCode: null,
          referralLink: null,
          referralCount: 0,
          credits: 0,
        }}
      />,
    )

    expect(screen.queryByRole('button', { name: /text an invite first/i })).not.toBeInTheDocument()
  })

  it('opens the sms share flow and tracks the referral share payload', async () => {
    const user = userEvent.setup()

    render(
      <FirstContactLaunchReminder
        reminder={{
          href: '/directory',
          activeListingCount: 2,
          listingTitle: 'Vintage camera bundle',
          referralCode: 'ABC12345',
          referralLink: 'https://barterkin.com/r/ABC12345',
          referralCount: 3,
          credits: 11,
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /text an invite first/i }))

    expect(mockOpen).toHaveBeenCalledWith(
      buildSmsReferralShareUrl('https://barterkin.com/r/ABC12345'),
      '_blank',
      'noopener,noreferrer',
    )
    expect(mockCapture).toHaveBeenCalledWith('referral_invite_shared', {
      method: 'sms',
      referral_code: 'ABC12345',
      referral_count: 3,
      credits: 11,
      share_surface: 'first_contact_launch',
    })
  })
})
