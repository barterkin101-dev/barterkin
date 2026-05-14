import { describe, expect, it } from 'vitest'
import { getDigestOptOutReminder, getStaleListingReminder, getUnreadMessageReminder } from '@/lib/data/dashboard-reminders'
import type { ListingRow } from '@/lib/data/listings.types'
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
      sender: {
        display_name: 'Alex',
        username: 'alex',
      },
    },
    unread_count: 2,
    ...overrides,
  }
}

function makeListing(overrides: Partial<ListingRow>): ListingRow {
  return {
    id: 'listing-1',
    profile_id: PROFILE_ID,
    title: 'Vintage camera bundle',
    description: 'Film camera bundle with lenses and carrying case for trade.',
    condition: 'good',
    trade_terms: 'Open to tools or furniture',
    price_estimate: null,
    status: 'active',
    created_at: '2026-04-20T09:00:00.000Z',
    updated_at: '2026-04-20T09:00:00.000Z',
    boosted_until: null,
    images: [],
    profiles: null,
    counties: null,
    categories: null,
    category_id: null,
    county_id: null,
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
            sender: {
              display_name: 'Alex',
              username: 'alex',
            },
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
            sender: {
              display_name: null,
              username: 'sam',
            },
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

  it('falls back to the last message sender when RLS hides the counterpart participant row', () => {
    const result = getUnreadMessageReminder(
      [
        makeConversation({
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
          ],
        }),
      ],
      PROFILE_ID,
      new Date('2026-05-13T09:00:00.000Z'),
    )

    expect(result).toMatchObject({
      href: '/dashboard/messages/conv-1',
      counterpartName: 'Alex',
      unreadConversationCount: 1,
      unreadMessageCount: 2,
    })
  })

  it('falls back to a generic label when RLS hides the counterpart row and sender profile payload is absent', () => {
    const result = getUnreadMessageReminder(
      [
        makeConversation({
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
          ],
          last_message: {
            content: 'Ping',
            created_at: '2026-05-11T09:00:00.000Z',
            sender_profile_id: 'profile-2',
            sender: null,
          },
        }),
      ],
      PROFILE_ID,
      new Date('2026-05-13T09:00:00.000Z'),
    )

    expect(result).toMatchObject({
      href: '/dashboard/messages/conv-1',
      counterpartName: 'a member',
      unreadConversationCount: 1,
      unreadMessageCount: 2,
    })
  })
})

describe('getDigestOptOutReminder', () => {
  it('returns null when emailDigestEnabled is true', () => {
    const result = getDigestOptOutReminder(true, true)
    expect(result).toBeNull()
  })

  it('returns null when emailDigestEnabled is null', () => {
    const result = getDigestOptOutReminder(null, true)
    expect(result).toBeNull()
  })

  it('returns null when profile is not published', () => {
    const result = getDigestOptOutReminder(false, false)
    expect(result).toBeNull()
  })

  it('returns a reminder when published and emailDigestEnabled is false', () => {
    const result = getDigestOptOutReminder(false, true)
    expect(result).toEqual({ href: '/profile/edit' })
  })
})

describe('getStaleListingReminder', () => {
  it('returns null when the listing is newer than 14 days', () => {
    const result = getStaleListingReminder(
      [
        makeListing({
          created_at: '2026-05-05T09:00:00.000Z',
          updated_at: '2026-05-05T09:00:00.000Z',
        }),
      ],
      {},
      new Date('2026-05-14T09:00:00.000Z'),
    )

    expect(result).toBeNull()
  })

  it('returns null when the active listing already has saves', () => {
    const result = getStaleListingReminder(
      [makeListing({ id: 'listing-saved' })],
      { 'listing-saved': 2 },
      new Date('2026-05-14T09:00:00.000Z'),
    )

    expect(result).toBeNull()
  })

  it('returns null when the listing is not active', () => {
    const result = getStaleListingReminder(
      [makeListing({ status: 'paused' })],
      {},
      new Date('2026-05-14T09:00:00.000Z'),
    )

    expect(result).toBeNull()
  })

  it('links to the oldest active zero-save listing that has gone stale', () => {
    const result = getStaleListingReminder(
      [
        makeListing({
          id: 'listing-oldest',
          title: 'Old camera kit',
          created_at: '2026-04-15T09:00:00.000Z',
          updated_at: '2026-04-28T09:00:00.000Z',
        }),
        makeListing({
          id: 'listing-newer',
          title: 'Handmade desk',
          created_at: '2026-04-22T09:00:00.000Z',
          updated_at: '2026-04-29T09:00:00.000Z',
        }),
        makeListing({
          id: 'listing-has-saves',
          title: 'Saved listing',
          created_at: '2026-04-10T09:00:00.000Z',
          updated_at: '2026-04-18T09:00:00.000Z',
        }),
      ],
      { 'listing-has-saves': 1 },
      new Date('2026-05-14T09:00:00.000Z'),
    )

    expect(result).toEqual({
      staleListingCount: 2,
      href: '/dashboard/listings/listing-oldest/edit',
      listingTitle: 'Old camera kit',
      listingId: 'listing-oldest',
      staleSince: '2026-04-28T09:00:00.000Z',
    })
  })

  it('uses updated_at so recently refreshed listings do not trigger the reminder', () => {
    const result = getStaleListingReminder(
      [
        makeListing({
          created_at: '2026-04-01T09:00:00.000Z',
          updated_at: '2026-05-10T09:00:00.000Z',
        }),
      ],
      {},
      new Date('2026-05-14T09:00:00.000Z'),
    )

    expect(result).toBeNull()
  })
})
