import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getNotifications } from '@/lib/data/notifications'

describe('getNotifications trade review prompts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds an unread trade review prompt when a completed trade is still unrated', async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === 'conversation_participants') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        }
      }

      if (table === 'tickets' || table === 'disputes') {
        const chain = {
          eq: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          or: vi.fn(() => chain),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }

        return { select: vi.fn(() => chain) }
      }

      if (table === 'trade_completions') {
        const chain = {
          eq: vi.fn(() => chain),
          or: vi.fn(() => chain),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                conversation_id: 'conv-1',
                initiator_profile_id: 'target-profile',
                recipient_profile_id: 'other-profile',
                completed_at: '2026-05-13T12:00:00.000Z',
                initiator: { display_name: 'Me', username: 'me' },
                recipient: { display_name: 'Bob', username: 'bob' },
              },
            ],
            error: null,
          }),
        }

        return { select: vi.fn(() => chain) }
      }

      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [
                { id: 'target-profile', display_name: 'Me', username: 'me' },
                { id: 'other-profile', display_name: 'Bob', username: 'bob' },
              ],
              error: null,
            }),
          })),
        }
      }

      if (table === 'ratings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    vi.mocked(createClient).mockResolvedValue({ from: fromMock } as never)

    const result = await getNotifications('target-profile')

    expect(result.unreadCount).toBe(1)
    expect(result.notifications).toHaveLength(1)
    expect(result.notifications[0]).toMatchObject({
      type: 'trade',
      title: 'Leave a trade review',
      link: '/dashboard/messages/conv-1',
      is_read: false,
    })
  })
})
