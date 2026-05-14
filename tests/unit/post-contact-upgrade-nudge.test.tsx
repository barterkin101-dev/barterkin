import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PostContactUpgradeNudge } from '@/components/messaging/PostContactUpgradeNudge'
import { getPostContactUpgradeNudgeProps } from '@/lib/post-contact-upgrade-nudge'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

describe('getPostContactUpgradeNudgeProps', () => {
  it('returns props when a free member has one contact start left after outreach', () => {
    const result = getPostContactUpgradeNudgeProps('free', {
      used: 9,
      limit: 10,
      remaining: 1,
      isNearLimit: true,
      isAtLimit: false,
    })

    expect(result).toMatchObject({
      used: 9,
      limit: 10,
      remaining: 1,
      premiumMonthlyPrice: '$9',
      premiumAnnualSavings: '$18',
      premiumContactLimit: 100,
    })
  })

  it('returns props when the send exhausts the free cap', () => {
    const result = getPostContactUpgradeNudgeProps('free', {
      used: 10,
      limit: 10,
      remaining: 0,
      isNearLimit: false,
      isAtLimit: true,
    })

    expect(result).toMatchObject({
      used: 10,
      limit: 10,
      remaining: 0,
    })
  })

  it('hides the nudge for paid members and free members above the threshold', () => {
    expect(getPostContactUpgradeNudgeProps('premium', {
      used: 99,
      limit: 100,
      remaining: 1,
      isNearLimit: false,
      isAtLimit: false,
    })).toBeNull()

    expect(getPostContactUpgradeNudgeProps('free', {
      used: 8,
      limit: 10,
      remaining: 2,
      isNearLimit: true,
      isAtLimit: false,
    })).toBeNull()
  })
})

describe('PostContactUpgradeNudge', () => {
  beforeEach(() => {
    mockCapture.mockReset()
  })

  it('renders the exact remaining count and tracks impression and click events', async () => {
    const user = userEvent.setup()

    render(
      <PostContactUpgradeNudge
        used={9}
        limit={10}
        remaining={1}
        premiumMonthlyPrice="$9"
        premiumAnnualSavings="$18"
        premiumContactLimit={100}
      />,
    )

    expect(screen.getByText('You have 1 free contact start left this month (9/10).')).toBeInTheDocument()
    expect(screen.getByText('Upgrade to Premium from $9/mo to unlock 100 conversation starts per month. Annual billing saves $18.')).toBeInTheDocument()

    const cta = screen.getByRole('link', { name: /see premium plans/i })
    expect(cta).toHaveAttribute('href', '/dashboard/billing')

    expect(mockCapture).toHaveBeenCalledWith('post_contact_upgrade_nudge_impression', expect.objectContaining({
      used: 9,
      limit: 10,
      remaining: 1,
    }))

    await user.click(cta)

    expect(mockCapture).toHaveBeenCalledWith('post_contact_upgrade_nudge_clicked', expect.objectContaining({
      used: 9,
      limit: 10,
      remaining: 1,
    }))
  })
})
