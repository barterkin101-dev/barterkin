import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCapture = vi.fn()

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: (...args: unknown[]) => mockCapture(...args),
}))

import { WarmConversationReengagementReminder } from '@/components/dashboard/WarmConversationReengagementReminder'

describe('WarmConversationReengagementReminder', () => {
  beforeEach(() => {
    mockCapture.mockReset()
  })

  it('renders the conversation deep link and tracks impression plus click events', async () => {
    const user = userEvent.setup()

    render(
      <WarmConversationReengagementReminder
        reminder={{
          staleConversationCount: 2,
          href: '/dashboard/messages/conv-123',
          counterpartName: 'Alex',
          lastMessageAt: '2026-05-12T09:00:00.000Z',
        }}
      />,
    )

    expect(screen.getByText(/your follow-up has been sitting for 3\+ days/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /send a follow-up/i })).toHaveAttribute(
      'href',
      '/dashboard/messages/conv-123',
    )
    expect(mockCapture).toHaveBeenCalledWith(
      'warm_conversation_reengagement_reminder_impression',
      { stale_conversation_count: 2 },
    )

    await user.click(screen.getByRole('link', { name: /send a follow-up/i }))

    expect(mockCapture).toHaveBeenCalledWith(
      'warm_conversation_reengagement_reminder_clicked',
      { stale_conversation_count: 2 },
    )
  })
})
