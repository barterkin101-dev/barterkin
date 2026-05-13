import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReferralInviteCard } from '@/components/dashboard/ReferralInviteCard'

const mockCapture = vi.fn()
const mockWriteText = vi.fn()
const mockShare = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

describe('ReferralInviteCard', () => {
  beforeEach(() => {
    mockCapture.mockClear()
    mockWriteText.mockReset()
    mockShare.mockReset()

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
    })
    expect(screen.getByRole('button', { name: /copied link/i })).toBeInTheDocument()
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
      text: 'Join me on Barterkin and trade skills with local members.',
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

    await userEvent.click(screen.getByRole('button', { name: /share or copy link/i }))

    expect(mockWriteText).toHaveBeenCalledWith('https://barterkin.com/r/ABCDEFGH')
    expect(mockCapture).toHaveBeenCalledWith('referral_invite_copied', {
      referral_code: 'ABCDEFGH',
      referral_count: 0,
      credits: 1,
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
