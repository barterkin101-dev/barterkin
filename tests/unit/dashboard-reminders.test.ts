import { describe, expect, it } from 'vitest'
import { getUnreadMessageReminder } from '@/lib/data/dashboard-reminders'
import type { ConversationRow } from '@/lib/data/messaging'

const PROFILE_ID = 'profile-1'

function makeConversation(overrides: Partial<ConversationRow>): ConversationRow {
  return {
    id: 'conv-1',
    listing_id: null,
    created_at: '2026-05-10T09:00:00.000Z',
    updated_at: '2026-05-10T09:00:00.000Z',
    participants: [
      {
        profile_id: PROFILE_ID,
        last_read_at: null,
        profile: {
          id: PROFILE_ID,
          display_name: 'Naeem',
          username: 'naeem',
          avatar_url: null,
        },
      },
      {
        profile_id: 'profile-2',
        last_read_at: null,
        profile: {
          id: 'profile-2',
          display_name: 'Alex',
          username: 'alex',
          avatar_url: null,
        },
      },
    ],
    last_message: {
      content: 'Checking in on the trade',
      created_at: '2026-05-11T09:00:00.000Z',
      sender_profile_id: 'profile-2',
    },
    unread_count: 2,
    ...overrides,
  }
}

describe('getUnreadMessageReminder', () => {
  it('returns null when unread messages are newer than 24 hours', () => {
    const result = getUnreadMessageReminder(
      [
        makeConversation({
          last_message: {
            content: 'Fresh ping',
            created_at: '2026-05-13T08:30:00.000Z',
            sender_profile_id: 'profile-2',
          },
        }),
      ],
      PROFILE_ID,
      new Date('2026-05-13T09:00:00.000Z'),
    )

    expect(result).toBeNull()
  })

  it('returns a reminder for unread messages older than 24 hours', () => {
    const result = getUnreadMessageReminder(
      [makeConversation({ id: 'conv-older' })],
      PROFILE_ID,
      new Date('2026-05-13T09:00:00.000Z'),
    )

    expect(result).toEqual({
      unreadConversationCount: 1,
      unreadMessageCount: 2,
      href: '/dashboard/messages/conv-older',
      counterpartName: 'Alex',
      lastMessageAt: '2026-05-11T09:00:00.000Z',
    })
  })

  it('ignores stale conversations when the last message was sent by the current member', () => {
    const result = getUnreadMessageReminder(
      [
        makeConversation({
          last_message: {
            content: 'My follow-up',
            created_at: '2026-05-11T09:00:00.000Z',
            sender_profile_id: PROFILE_ID,
          },
        }),
      ],
      PROFILE_ID,
      new Date('2026-05-13T09:00:00.000Z'),
    )

    expect(result).toBeNull()
  })

  it('aggregates unread counts across multiple stale conversations and keeps the top CTA', () => {
    const result = getUnreadMessageReminder(
      [
        makeConversation({
          id: 'conv-priority',
          unread_count: 1,
          last_message: {
            content: 'First thread',
            created_at: '2026-05-12T08:00:00.000Z',
            sender_profile_id: 'profile-2',
          },
        }),
        makeConversation({
          id: 'conv-second',
          unread_count: 3,
          participants: [
            {
              profile_id: PROFILE_ID,
              last_read_at: null,
              profile: {
                id: PROFILE_ID,
                display_name: 'Naeem',
                username: 'naeem',
                avatar_url: null,
              },
            },
            {
              profile_id: 'profile-3',
              last_read_at: null,
              profile: {
                id: 'profile-3',
                display_name: null,
                username: 'sam',
                avatar_url: null,
              },
            },
          ],
          last_message: {
            content: 'Second thread',
            created_at: '2026-05-11T07:00:00.000Z',
            sender_profile_id: 'profile-3',
          },
        }),
      ],
      PROFILE_ID,
      new Date('2026-05-13T09:00:00.000Z'),
    )

    expect(result).toMatchObject({
      unreadConversationCount: 2,
      unreadMessageCount: 4,
      href: '/dashboard/messages/conv-priority',
      counterpartName: 'Alex',
    })
  })

  it('skips unread conversations that have no last message payload', () => {
    const result = getUnreadMessageReminder(
      [
        makeConversation({
          id: 'conv-empty',
          last_message: null,
          unread_count: 4,
        }),
        makeConversation({
          id: 'conv-valid',
          unread_count: 1,
        }),
      ],
      PROFILE_ID,
      new Date('2026-05-13T09:00:00.000Z'),
    )

    expect(result).toMatchObject({
      href: '/dashboard/messages/conv-valid',
      unreadConversationCount: 1,
      unreadMessageCount: 1,
    })
  })
})
