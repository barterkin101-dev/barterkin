import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UnreadMessageReminder } from '@/components/dashboard/UnreadMessageReminder'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

describe('UnreadMessageReminder', () => {
  beforeEach(() => {
    mockCapture.mockClear()
  })

  it('renders standard 24-hour reminder copy', () => {
    render(
      <UnreadMessageReminder
        reminder={{
          unreadConversationCount: 1,
          unreadMessageCount: 2,
          href: '/dashboard/messages/conv-1',
          counterpartName: 'Alex',
          lastMessageAt: '2026-05-11T09:00:00.000Z',
          staleTier: 'day',
        }}
      />,
    )

    expect(screen.getByText(/untouched for more than 24 hours/i)).toBeInTheDocument()
    expect(screen.getByText(/alex sent the last message over 24 hours ago/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /reply to alex/i })).toBeInTheDocument()
    expect(screen.getByText(/before the trade goes cold/i)).toBeInTheDocument()
  })

  it('renders stronger 48-hour reminder copy', () => {
    render(
      <UnreadMessageReminder
        reminder={{
          unreadConversationCount: 2,
          unreadMessageCount: 4,
          href: '/dashboard/messages/conv-2',
          counterpartName: 'Sam',
          lastMessageAt: '2026-05-10T09:00:00.000Z',
          staleTier: 'two-day',
        }}
      />,
    )

    expect(screen.getByText(/untouched for more than 48 hours/i)).toBeInTheDocument()
    expect(screen.getByText(/sam sent the last message over 48 hours ago/i)).toBeInTheDocument()
    expect(screen.getByText(/reply now to keep this trade alive/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /reply to sam now/i })).toBeInTheDocument()
    expect(screen.getByText(/keep the barter moving before momentum slips/i)).toBeInTheDocument()
  })

  it('fires a single impression event with the unread reminder payload', () => {
    render(
      <UnreadMessageReminder
        reminder={{
          unreadConversationCount: 2,
          unreadMessageCount: 4,
          href: '/dashboard/messages/conv-2',
          counterpartName: 'Sam',
          lastMessageAt: '2026-05-10T09:00:00.000Z',
          staleTier: 'two-day',
        }}
      />,
    )

    expect(mockCapture).toHaveBeenCalledTimes(1)
    expect(mockCapture).toHaveBeenCalledWith('unread_message_reminder_impression', {
      stale_tier: 'two-day',
      unread_conversation_count: 2,
      unread_message_count: 4,
    })
  })

  it('fires a click event when the reply CTA is used', async () => {
    const user = userEvent.setup()

    render(
      <UnreadMessageReminder
        reminder={{
          unreadConversationCount: 1,
          unreadMessageCount: 2,
          href: '/dashboard/messages/conv-1',
          counterpartName: 'Alex',
          lastMessageAt: '2026-05-11T09:00:00.000Z',
          staleTier: 'day',
        }}
      />,
    )

    await user.click(screen.getByRole('link', { name: /reply to alex/i }))

    expect(mockCapture).toHaveBeenNthCalledWith(2, 'unread_message_reminder_clicked', {
      stale_tier: 'day',
      unread_conversation_count: 1,
      unread_message_count: 2,
    })
  })
})
