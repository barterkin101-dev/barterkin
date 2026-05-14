import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildFacebookReferralShareUrl,
  buildReferralInviteMessage,
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

  it('builds stable X, Facebook, and WhatsApp share URLs', () => {
    expect(buildXReferralShareUrl('https://barterkin.com/r/ABCDEFGH')).toBe(
      'https://twitter.com/intent/tweet?text=I%27m+on+Barterkin%2C+a+local+skill-trading+network+for+neighbors.+Join+with+my+invite+link%3A+https%3A%2F%2Fbarterkin.com%2Fr%2FABCDEFGH&url=https%3A%2F%2Fbarterkin.com%2Fr%2FABCDEFGH',
    )
    expect(buildFacebookReferralShareUrl('https://barterkin.com/r/ABCDEFGH')).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fbarterkin.com%2Fr%2FABCDEFGH',
    )
    expect(buildWhatsAppReferralShareUrl('https://barterkin.com/r/ABCDEFGH')).toBe(
      'https://wa.me/?text=I%27m+on+Barterkin%2C+a+local+skill-trading+network+for+neighbors.+Join+with+my+invite+link%3A+https%3A%2F%2Fbarterkin.com%2Fr%2FABCDEFGH',
    )
  })

  it('copies invite link and tracks analytics', async () => {
    mockWriteText.mockResolvedValue(undefined)

    render(
      <ReferralInviteCard
        referralCode="ABCDEFGH"
        referralLink="https://barterkin.com/r/ABCDEFGH"
        credits={3}
        referralCount={2}
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
        referralCount={5}
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
        referralCount={4}
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
        referralCount={0}
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
        referralCount={3}
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

  it('opens Facebook and WhatsApp share windows and tracks their channels', async () => {
    render(
      <ReferralInviteCard
        referralCode="ABCDEFGH"
        referralLink="https://barterkin.com/r/ABCDEFGH"
        credits={6}
        referralCount={8}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /share on facebook/i }))
    await userEvent.click(screen.getByRole('button', { name: /share on whatsapp/i }))

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
        referralCount={1}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /share invite link/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /share invite link/i })).toBeEnabled()
    })
    expect(mockCapture).not.toHaveBeenCalled()
  })
})
