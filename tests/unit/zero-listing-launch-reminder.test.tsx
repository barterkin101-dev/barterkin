import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  buildEmailReferralShareUrl,
  buildSmsReferralShareUrl,
  buildWhatsAppReferralShareUrl,
} from '@/lib/referral-share'
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

    expect(screen.queryByRole('link', { name: /share via whatsapp/i })).not.toBeInTheDocument()
  })

  it('shows the referral share CTAs when referralCode and referralLink are present', () => {
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

    expect(screen.getByRole('link', { name: /share via whatsapp/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /share via sms/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /share via email/i })).toBeInTheDocument()
  })

  it('builds share hrefs for each channel and fires analytics with the selected method', async () => {
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

    const whatsappLink = screen.getByRole('link', { name: /share via whatsapp/i })
    const smsLink = screen.getByRole('link', { name: /share via sms/i })
    const emailLink = screen.getByRole('link', { name: /share via email/i })

    expect(whatsappLink).toHaveAttribute(
      'href',
      buildWhatsAppReferralShareUrl('https://barterkin.com/r/ABC12345'),
    )
    expect(smsLink).toHaveAttribute(
      'href',
      buildSmsReferralShareUrl('https://barterkin.com/r/ABC12345'),
    )
    expect(emailLink).toHaveAttribute(
      'href',
      buildEmailReferralShareUrl('https://barterkin.com/r/ABC12345'),
    )
    expect(whatsappLink).toHaveAttribute('target', '_blank')
    expect(smsLink).toHaveAttribute('target', '_blank')
    expect(emailLink).toHaveAttribute('target', '_blank')

    await user.click(whatsappLink)
    await user.click(smsLink)
    await user.click(emailLink)

    expect(mockCapture).toHaveBeenNthCalledWith(1, 'referral_invite_shared', {
      method: 'whatsapp',
      referral_code: 'ABC12345',
      share_target: 'zero_listing_launch',
    })
    expect(mockCapture).toHaveBeenNthCalledWith(2, 'referral_invite_shared', {
      method: 'sms',
      referral_code: 'ABC12345',
      share_target: 'zero_listing_launch',
    })
    expect(mockCapture).toHaveBeenNthCalledWith(3, 'referral_invite_shared', {
      method: 'email',
      referral_code: 'ABC12345',
      share_target: 'zero_listing_launch',
    })
  })
})
