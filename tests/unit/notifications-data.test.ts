import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getNotifications } from '@/lib/data/notifications'

function makeTerminalChain<T>(result: T) {
  return {
    eq: vi.fn().mockResolvedValue(result),
  }
}

function makeFilteredChain<T>(result: T) {
  const chain = {
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn().mockResolvedValue(result),
  }

  return chain
}

describe('getNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('counts only message notifications as unread when ticket/dispute updates have no read state', async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === 'conversation_participants') {
        return {
          select: vi.fn(() =>
            makeTerminalChain({
              data: [
                {
                  conversation_id: 'conv-1',
                  last_read_at: '2026-05-13T08:00:00.000Z',
                  conversations: {
                    messages: [
                      {
                        id: 'm-1',
                        sender_profile_id: 'other-profile',
                        created_at: '2026-05-13T09:00:00.000Z',
                        content: 'Fresh unread message',
                      },
                      {
                        id: 'm-2',
                        sender_profile_id: 'target-profile',
                        created_at: '2026-05-13T09:05:00.000Z',
                        content: 'My own reply',
                      },
                    ],
                  },
                },
              ],
              error: null,
            }),
          ),
        }
      }

      if (table === 'tickets') {
        return {
          select: vi.fn(() =>
            makeFilteredChain({
              data: [
                {
                  id: 'ticket-1',
                  subject: 'Verification help',
                  status: 'waiting',
                  updated_at: '2026-05-13T10:00:00.000Z',
                },
              ],
              error: null,
            }),
          ),
        }
      }

      if (table === 'disputes') {
        return {
          select: vi.fn(() =>
            makeFilteredChain({
              data: [
                {
                  id: 'dispute-1',
                  reason: 'Trade item condition mismatch',
                  status: 'under_review',
                  updated_at: '2026-05-13T11:00:00.000Z',
                },
              ],
              error: null,
            }),
          ),
        }
      }

      if (table === 'trade_completions') {
        return {
          select: vi.fn(() => {
            const chain = {
              eq: vi.fn(() => chain),
              or: vi.fn(() => chain),
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }

            return chain
          }),
        }
      }

      if (table === 'in_app_notifications') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    vi.mocked(createClient).mockResolvedValue({
      from: fromMock,
    } as never)

    const result = await getNotifications('target-profile')

    expect(result.unreadCount).toBe(1)
    expect(result.notifications).toHaveLength(3)
    expect(result.notifications.find((item) => item.type === 'message')?.is_read).toBe(false)
    expect(result.notifications.find((item) => item.type === 'ticket')?.is_read).toBe(true)
    expect(result.notifications.find((item) => item.type === 'dispute')?.is_read).toBe(true)
  })
})
