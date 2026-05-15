import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { buildWhatsAppReferralShareUrl } from '@/lib/referral-share'
import { ZeroListingLaunchReminder } from '@/components/dashboard/ZeroListingLaunchReminder'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

describe('ZeroListingLaunchReminder', () => {
  beforeEach(() => {
    mockCapture.mockClear()
  })

  it('renders the main create-listing CTA', () => {
    render(
      <ZeroListingLaunchReminder
        reminder={{ href: '/dashboard/listings/new', rewardCredits: 5, referralCode: null, referralLink: null }}
      />,
    )

    expect(screen.getByRole('link', { name: /create listing/i })).toHaveAttribute('href', '/dashboard/listings/new')
  })

  it('shows quest reward copy when rewardCredits is present', () => {
    render(
      <ZeroListingLaunchReminder
        reminder={{ href: '/dashboard/listings/new', rewardCredits: 5, referralCode: null, referralLink: null }}
      />,
    )

    expect(screen.getByText(/earn 5 quest credits automatically/i)).toBeInTheDocument()
  })

  it('shows generic copy when rewardCredits is null', () => {
    render(
      <ZeroListingLaunchReminder
        reminder={{ href: '/dashboard/listings/new', rewardCredits: null, referralCode: null, referralLink: null }}
      />,
    )

    expect(screen.getByText(/publish a fresh offer or service/i)).toBeInTheDocument()
  })

  it('does not show the referral share CTA when referralCode is missing', () => {
    render(
      <ZeroListingLaunchReminder
        reminder={{ href: '/dashboard/listings/new', rewardCredits: 5, referralCode: null, referralLink: null }}
      />,
    )

    expect(screen.queryByRole('link', { name: /share invite/i })).not.toBeInTheDocument()
  })

  it('shows the referral share CTA when referralCode and referralLink are present', () => {
    render(
      <ZeroListingLaunchReminder
        reminder={{
          href: '/dashboard/listings/new',
          rewardCredits: 5,
          referralCode: 'ABC12345',
          referralLink: 'https://barterkin.com/r/ABC12345',
        }}
      />,
    )

    expect(screen.getByRole('link', { name: /share invite/i })).toBeInTheDocument()
  })

  it('builds a whatsapp share href and fires analytics when the share CTA is clicked', async () => {
    const user = userEvent.setup()

    render(
      <ZeroListingLaunchReminder
        reminder={{
          href: '/dashboard/listings/new',
          rewardCredits: 5,
          referralCode: 'ABC12345',
          referralLink: 'https://barterkin.com/r/ABC12345',
        }}
      />,
    )

    const shareLink = screen.getByRole('link', { name: /share invite/i })

    expect(shareLink).toHaveAttribute(
      'href',
      buildWhatsAppReferralShareUrl('https://barterkin.com/r/ABC12345'),
    )
    expect(shareLink).toHaveAttribute('target', '_blank')

    await user.click(shareLink)

    expect(mockCapture).toHaveBeenCalledWith('referral_invite_shared', {
      method: 'whatsapp',
      referral_code: 'ABC12345',
      share_target: 'zero_listing_launch',
    })
  })
})
