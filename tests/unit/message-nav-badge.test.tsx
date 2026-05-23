import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

// Mock next/navigation usePathname
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}))

import { NavLinks } from '@/components/layout/NavLinks'

describe('NavLinks message badge', () => {
  beforeEach(() => {
    mockCapture.mockClear()
  })

  it('shows badge when unseenMessageCount > 0 on desktop', () => {
    render(
      <NavLinks
        displayName="Alex"
        unseenMessageCount={3}
        notifications={[]}
        siteUpdates={[]}
      />,
    )

    const messagesLink = screen.getByRole('link', { name: /messages/i })
    expect(messagesLink).toBeInTheDocument()
    expect(screen.getAllByText('3')).toHaveLength(2)
  })

  it('does not show badge when unseenMessageCount is 0', () => {
    render(
      <NavLinks
        displayName="Alex"
        unseenMessageCount={0}
        notifications={[]}
        siteUpdates={[]}
      />,
    )

    expect(screen.getByRole('link', { name: /messages/i })).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('caps badge at 9+ for counts above 9', () => {
    render(
      <NavLinks
        displayName="Alex"
        unseenMessageCount={12}
        notifications={[]}
        siteUpdates={[]}
      />,
    )

    expect(screen.getAllByText('9+')).toHaveLength(2)
  })

  it('fires message_notification_badge_seen when Messages link is clicked with unread count', async () => {
    const user = userEvent.setup()
    render(
      <NavLinks
        displayName="Alex"
        unseenMessageCount={3}
        notifications={[]}
        siteUpdates={[]}
      />,
    )

    await user.click(screen.getByRole('link', { name: /messages/i }))

    expect(mockCapture).toHaveBeenCalledTimes(1)
    expect(mockCapture).toHaveBeenCalledWith('message_notification_badge_seen', {
      unseen_count: 3,
      source: 'nav_click',
    })
  })

  it('does not fire analytics when badge count is 0', async () => {
    const user = userEvent.setup()
    render(
      <NavLinks
        displayName="Alex"
        unseenMessageCount={0}
        notifications={[]}
        siteUpdates={[]}
      />,
    )

    await user.click(screen.getByRole('link', { name: /messages/i }))

    expect(mockCapture).not.toHaveBeenCalled()
  })
})
