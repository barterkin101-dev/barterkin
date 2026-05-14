import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildEmailReferralShareUrl,
  buildFacebookReferralShareUrl,
  buildLinkedInReferralShareUrl,
  buildReferralInviteMessage,
  buildSmsReferralShareUrl,
  buildTelegramReferralShareUrl,
  buildWhatsAppReferralShareUrl,
  buildXReferralShareUrl,
  ReferralInviteCard,
} from '@/components/dashboard/ReferralInviteCard'

const mockCapture = vi.fn()
const mockWriteText = vi.fn()
const mockShare = vi.fn()
const mockOpen = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

describe('ReferralInviteCard', () => {
  beforeEach(() => {
    mockCapture.mockClear()
    mockWriteText.mockReset()
    mockShare.mockReset()
    mockOpen.mockReset()

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: mockWriteText,
      },
    })

    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: undefined,
    })

    window.open = mockOpen
  })

  it('builds stable share URLs for all supported referral channels', () => {
    expect(buildXReferralShareUrl('https://barterkin.com/r/ABCDEFGH')).toBe(
      'https://twitter.com/intent/tweet?text=I%27m+on+Barterkin%2C+a+local+skill-trading+network+for+neighbors.+Join+with+my+invite+link%3A+https%3A%2F%2Fbarterkin.com%2Fr%2FABCDEFGH&url=https%3A%2F%2Fbarterkin.com%2Fr%2FABCDEFGH',
    )
    expect(buildFacebookReferralShareUrl('https://barterkin.com/r/ABCDEFGH')).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fbarterkin.com%2Fr%2FABCDEFGH',
    )
    expect(buildWhatsAppReferralShareUrl('https://barterkin.com/r/ABCDEFGH')).toBe(
      'https://wa.me/?text=I%27m+on+Barterkin%2C+a+local+skill-trading+network+for+neighbors.+Join+with+my+invite+link%3A+https%3A%2F%2Fbarterkin.com%2Fr%2FABCDEFGH',
    )
    expect(buildTelegramReferralShareUrl('https://barterkin.com/r/ABCDEFGH')).toBe(
      'https://t.me/share/url?url=https%3A%2F%2Fbarterkin.com%2Fr%2FABCDEFGH&text=I%27m+on+Barterkin%2C+a+local+skill-trading+network+for+neighbors.+Join+with+my+invite+link%3A+https%3A%2F%2Fbarterkin.com%2Fr%2FABCDEFGH',
    )
    expect(buildLinkedInReferralShareUrl('https://barterkin.com/r/ABCDEFGH')).toBe(
      'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fbarterkin.com%2Fr%2FABCDEFGH',
    )
    expect(buildEmailReferralShareUrl('https://barterkin.com/r/ABCDEFGH')).toBe(
      'mailto:?subject=Join+me+on+Barterkin&body=I%27m+on+Barterkin%2C+a+local+skill-trading+network+for+neighbors.+Join+with+my+invite+link%3A+https%3A%2F%2Fbarterkin.com%2Fr%2FABCDEFGH',
    )
    expect(buildSmsReferralShareUrl('https://barterkin.com/r/ABCDEFGH')).toBe(
      'sms:?body=I%27m+on+Barterkin%2C+a+local+skill-trading+network+for+neighbors.+Join+with+my+invite+link%3A+https%3A%2F%2Fbarterkin.com%2Fr%2FABCDEFGH',
    )
  })

  it('copies invite link and tracks analytics', async () => {
    mockWriteText.mockResolvedValue(undefined)

    render(
      <ReferralInviteCard
        referralCode="ABCDEFGH"
        referralLink="https://barterkin.com/r/ABCDEFGH"
        credits={3}
        convertedReferralCount={2}
        pendingReferralCount={1}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /copy invite link/i }))

    expect(mockWriteText).toHaveBeenCalledWith('https://barterkin.com/r/ABCDEFGH')
    expect(mockCapture).toHaveBeenCalledWith('referral_invite_copied', {
      referral_code: 'ABCDEFGH',
      referral_count: 2,
      credits: 3,
      copy_target: 'link',
    })
    expect(screen.getByRole('button', { name: /copied link/i })).toBeInTheDocument()
  })

  it('copies the suggested invite message and tracks the copy target', async () => {
    mockWriteText.mockResolvedValue(undefined)

    render(
      <ReferralInviteCard
        referralCode="ABCDEFGH"
        referralLink="https://barterkin.com/r/ABCDEFGH"
        credits={7}
        convertedReferralCount={5}
        pendingReferralCount={0}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /copy invite message/i }))

    expect(mockWriteText).toHaveBeenCalledWith(
      buildReferralInviteMessage('https://barterkin.com/r/ABCDEFGH'),
    )
    expect(mockCapture).toHaveBeenCalledWith('referral_invite_copied', {
      referral_code: 'ABCDEFGH',
      referral_count: 5,
      credits: 7,
      copy_target: 'message',
    })
    expect(screen.getByRole('button', { name: /copied message/i })).toBeInTheDocument()
  })

  it('uses native share when available and tracks successful shares', async () => {
    mockShare.mockResolvedValue(undefined)

    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: mockShare,
    })

    render(
      <ReferralInviteCard
        referralCode="ABCDEFGH"
        referralLink="https://barterkin.com/r/ABCDEFGH"
        credits={5}
        convertedReferralCount={4}
        pendingReferralCount={2}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /share invite link/i }))

    expect(mockShare).toHaveBeenCalledWith({
      title: 'Join me on Barterkin',
      text: buildReferralInviteMessage('https://barterkin.com/r/ABCDEFGH'),
      url: 'https://barterkin.com/r/ABCDEFGH',
    })
    expect(mockCapture).toHaveBeenCalledWith('referral_invite_shared', {
      method: 'native-share',
      referral_code: 'ABCDEFGH',
      referral_count: 4,
      credits: 5,
    })
  })

  it('falls back to copy when native share is unavailable', async () => {
    mockWriteText.mockResolvedValue(undefined)

    render(
      <ReferralInviteCard
        referralCode="ABCDEFGH"
        referralLink="https://barterkin.com/r/ABCDEFGH"
        credits={1}
        convertedReferralCount={0}
        pendingReferralCount={3}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /copy invite link/i }))

    expect(mockWriteText).toHaveBeenCalledWith('https://barterkin.com/r/ABCDEFGH')
    expect(mockCapture).toHaveBeenCalledWith('referral_invite_copied', {
      referral_code: 'ABCDEFGH',
      referral_count: 0,
      credits: 1,
      copy_target: 'link',
    })
  })

  it('opens an X share window and tracks the selected channel', async () => {
    render(
      <ReferralInviteCard
        referralCode="ABCDEFGH"
        referralLink="https://barterkin.com/r/ABCDEFGH"
        credits={4}
        convertedReferralCount={3}
        pendingReferralCount={1}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /share on x/i }))

    expect(mockOpen).toHaveBeenCalledWith(
      buildXReferralShareUrl('https://barterkin.com/r/ABCDEFGH'),
      '_blank',
      'noopener,noreferrer',
    )
    expect(mockCapture).toHaveBeenCalledWith('referral_invite_shared', {
      method: 'x',
      referral_code: 'ABCDEFGH',
      referral_count: 3,
      credits: 4,
    })
  })

  it('opens Facebook, WhatsApp, Telegram, and LinkedIn share windows and tracks their channels', async () => {
    render(
      <ReferralInviteCard
        referralCode="ABCDEFGH"
        referralLink="https://barterkin.com/r/ABCDEFGH"
        credits={6}
        convertedReferralCount={8}
        pendingReferralCount={0}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /share on facebook/i }))
    await userEvent.click(screen.getByRole('button', { name: /share on whatsapp/i }))
    await userEvent.click(screen.getByRole('button', { name: /share on telegram/i }))
    await userEvent.click(screen.getByRole('button', { name: /share on linkedin/i }))

    expect(mockOpen).toHaveBeenNthCalledWith(
      1,
      buildFacebookReferralShareUrl('https://barterkin.com/r/ABCDEFGH'),
      '_blank',
      'noopener,noreferrer',
    )
    expect(mockOpen).toHaveBeenNthCalledWith(
      2,
      buildWhatsAppReferralShareUrl('https://barterkin.com/r/ABCDEFGH'),
      '_blank',
      'noopener,noreferrer',
    )
    expect(mockOpen).toHaveBeenNthCalledWith(
      3,
      buildTelegramReferralShareUrl('https://barterkin.com/r/ABCDEFGH'),
      '_blank',
      'noopener,noreferrer',
    )
    expect(mockOpen).toHaveBeenNthCalledWith(
      4,
      buildLinkedInReferralShareUrl('https://barterkin.com/r/ABCDEFGH'),
      '_blank',
      'noopener,noreferrer',
    )
    expect(mockCapture).toHaveBeenNthCalledWith(1, 'referral_invite_shared', {
      method: 'facebook',
      referral_code: 'ABCDEFGH',
      referral_count: 8,
      credits: 6,
    })
    expect(mockCapture).toHaveBeenNthCalledWith(2, 'referral_invite_shared', {
      method: 'whatsapp',
      referral_code: 'ABCDEFGH',
      referral_count: 8,
      credits: 6,
    })
    expect(mockCapture).toHaveBeenNthCalledWith(3, 'referral_invite_shared', {
      method: 'telegram',
      referral_code: 'ABCDEFGH',
      referral_count: 8,
      credits: 6,
    })
    expect(mockCapture).toHaveBeenNthCalledWith(4, 'referral_invite_shared', {
      method: 'linkedin',
      referral_code: 'ABCDEFGH',
      referral_count: 8,
      credits: 6,
    })
  })

  it('opens SMS and email share actions and tracks their channels', async () => {
    render(
      <ReferralInviteCard
        referralCode="ABCDEFGH"
        referralLink="https://barterkin.com/r/ABCDEFGH"
        credits={9}
        convertedReferralCount={6}
        pendingReferralCount={1}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /share by sms/i }))
    await userEvent.click(screen.getByRole('button', { name: /share by email/i }))

    expect(mockOpen).toHaveBeenNthCalledWith(
      1,
      buildSmsReferralShareUrl('https://barterkin.com/r/ABCDEFGH'),
      '_blank',
      'noopener,noreferrer',
    )
    expect(mockOpen).toHaveBeenNthCalledWith(
      2,
      buildEmailReferralShareUrl('https://barterkin.com/r/ABCDEFGH'),
      '_blank',
      'noopener,noreferrer',
    )
    expect(mockCapture).toHaveBeenNthCalledWith(1, 'referral_invite_shared', {
      method: 'sms',
      referral_code: 'ABCDEFGH',
      referral_count: 6,
      credits: 9,
    })
    expect(mockCapture).toHaveBeenNthCalledWith(2, 'referral_invite_shared', {
      method: 'email',
      referral_code: 'ABCDEFGH',
      referral_count: 6,
      credits: 9,
    })
  })

  it('does not track a share event when the native share flow rejects', async () => {
    mockShare.mockRejectedValue(new Error('cancelled'))

    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: mockShare,
    })

    render(
      <ReferralInviteCard
        referralCode="ABCDEFGH"
        referralLink="https://barterkin.com/r/ABCDEFGH"
        credits={2}
        convertedReferralCount={1}
        pendingReferralCount={4}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /share invite link/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /share invite link/i })).toBeEnabled()
    })
    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('shows converted and pending referral counts separately', () => {
    render(
      <ReferralInviteCard
        referralCode="ABCDEFGH"
        referralLink="https://barterkin.com/r/ABCDEFGH"
        credits={10}
        convertedReferralCount={3}
        pendingReferralCount={2}
      />,
    )

    expect(screen.getByText('Converted')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText(/earn 10 credits/i)).toBeInTheDocument()
  })

  it('shows concrete payout math when referrals are pending', () => {
    render(
      <ReferralInviteCard
        referralCode="ABCDEFGH"
        referralLink="https://barterkin.com/r/ABCDEFGH"
        credits={10}
        convertedReferralCount={3}
        pendingReferralCount={2}
      />,
    )

    expect(screen.getByText('Next reward')).toBeInTheDocument()
    expect(screen.getByText('2 pending invites can unlock 20 credits')).toBeInTheDocument()
    expect(screen.getByText(/quick follow-up can turn them into credits/i)).toBeInTheDocument()
  })

  it('shows a next-invite prompt when no referrals are pending', () => {
    render(
      <ReferralInviteCard
        referralCode="ABCDEFGH"
        referralLink="https://barterkin.com/r/ABCDEFGH"
        credits={10}
        convertedReferralCount={1}
        pendingReferralCount={0}
      />,
    )

    expect(screen.getByText('Next reward')).toBeInTheDocument()
    expect(screen.getByText('One more referral unlocks another 10 credits')).toBeInTheDocument()
    expect(screen.getByText(/copy your invite message/i)).toBeInTheDocument()
  })
})
