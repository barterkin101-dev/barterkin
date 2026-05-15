import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UnreadMessageReminder } from '@/components/dashboard/UnreadMessageReminder'

describe('UnreadMessageReminder', () => {
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
    expect(screen.getByText(/keep the barter moving before momentum slips/i)).toBeInTheDocument()
  })
})
