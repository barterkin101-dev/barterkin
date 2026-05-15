import { describe, expect, it } from 'vitest'
import { getDigestOptOutReminder, getFirstContactLaunchReminder, getFirstTradeProgressReminder, getFreshListingReminder, getOnboardingReturnReminder, getSecondListingExpansionReminder, getStaleListingReminder, getUnreadMessageReminder, getZeroListingLaunchReminder } from '@/lib/data/dashboard-reminders'
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
      staleTier: 'two-day',
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
      unreadConversationCount: 1,
      unreadMessageCount: 3,
      href: '/dashboard/messages/conv-second',
      counterpartName: 'sam',
      staleTier: 'two-day',
    })
  })

  it('keeps two-day reminder counts scoped to the 48-hour tier when fresher stale threads also exist', () => {
    const result = getUnreadMessageReminder(
      [
        makeConversation({
          id: 'conv-day-old',
          unread_count: 2,
          last_message: {
            content: 'Day-old thread',
            created_at: '2026-05-12T08:00:00.000Z',
            sender_profile_id: 'profile-2',
            sender: {
              display_name: 'Alex',
              username: 'alex',
            },
          },
        }),
        makeConversation({
          id: 'conv-two-day',
          unread_count: 5,
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
                display_name: 'Sam',
                username: 'sam',
                avatar_url: null,
              },
            },
          ],
          last_message: {
            content: 'Two-day thread',
            created_at: '2026-05-11T07:00:00.000Z',
            sender_profile_id: 'profile-3',
            sender: {
              display_name: 'Sam',
              username: 'sam',
            },
          },
        }),
      ],
      PROFILE_ID,
      new Date('2026-05-13T09:00:00.000Z'),
    )

    expect(result).toMatchObject({
      unreadConversationCount: 1,
      unreadMessageCount: 5,
      href: '/dashboard/messages/conv-two-day',
      counterpartName: 'Sam',
      staleTier: 'two-day',
    })
  })

  it('uses the 24-hour tier when no unread thread is older than 48 hours', () => {
    const result = getUnreadMessageReminder(
      [
        makeConversation({
          id: 'conv-older-24h',
          last_message: {
            content: 'One day old',
            created_at: '2026-05-12T08:00:00.000Z',
            sender_profile_id: 'profile-2',
            sender: {
              display_name: 'Alex',
              username: 'alex',
            },
          },
        }),
        makeConversation({
          id: 'conv-newer-24h',
          last_message: {
            content: 'Still stale',
            created_at: '2026-05-12T20:00:00.000Z',
            sender_profile_id: 'profile-3',
            sender: {
              display_name: 'Sam',
              username: 'sam',
            },
          },
        }),
      ],
      PROFILE_ID,
      new Date('2026-05-13T09:00:00.000Z'),
    )

    expect(result).toMatchObject({
      href: '/dashboard/messages/conv-older-24h',
      counterpartName: 'Alex',
      staleTier: 'day',
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
      staleTier: 'two-day',
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
      staleTier: 'two-day',
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
      staleTier: 'two-day',
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

describe('getOnboardingReturnReminder', () => {
  it('returns a reminder when onboarding is incomplete and the member explicitly skipped setup', () => {
    expect(getOnboardingReturnReminder(null, true)).toEqual({
      href: '/onboarding?step=1',
    })
  })

  it('returns null when onboarding is incomplete but the member never skipped setup', () => {
    expect(getOnboardingReturnReminder(null, false)).toBeNull()
  })

  it('returns null after onboarding is complete even if the skip cookie still exists', () => {
    expect(getOnboardingReturnReminder('2026-05-14T12:00:00.000Z', true)).toBeNull()
  })
})

describe('getZeroListingLaunchReminder', () => {
  it('returns null when onboarding is incomplete', () => {
    expect(getZeroListingLaunchReminder(null, [], false)).toBeNull()
  })

  it('returns null when the member already has an active listing', () => {
    expect(
      getZeroListingLaunchReminder(
        '2026-05-14T12:00:00.000Z',
        [makeListing({ status: 'active' })],
        false,
      ),
    ).toBeNull()
  })

  it('returns a first-listing reward reminder when the member is onboarded and has never listed', () => {
    expect(
      getZeroListingLaunchReminder(
        '2026-05-14T12:00:00.000Z',
        [],
        false,
      ),
    ).toEqual({
      href: '/dashboard/listings/new',
      rewardCredits: 5,
      referralCode: null,
      referralLink: null,
      referralCount: 0,
      credits: 0,
    })
  })

  it('keeps the launch CTA but drops first-listing reward copy when prior inactive listings exist', () => {
    expect(
      getZeroListingLaunchReminder(
        '2026-05-14T12:00:00.000Z',
        [makeListing({ status: 'paused' })],
        true,
      ),
    ).toEqual({
      href: '/dashboard/listings/new',
      rewardCredits: null,
      referralCode: null,
      referralLink: null,
      referralCount: 0,
      credits: 0,
    })
  })

  it('includes referral code and link when provided', () => {
    expect(
      getZeroListingLaunchReminder(
        '2026-05-14T12:00:00.000Z',
        [],
        false,
        'ABC12345',
        'https://barterkin.com/r/ABC12345',
      ),
    ).toEqual({
      href: '/dashboard/listings/new',
      rewardCredits: 5,
      referralCode: 'ABC12345',
      referralLink: 'https://barterkin.com/r/ABC12345',
      referralCount: 0,
      credits: 0,
    })
  })

  it('omits referral fields when referral code is missing', () => {
    expect(
      getZeroListingLaunchReminder(
        '2026-05-14T12:00:00.000Z',
        [],
        false,
        null,
        null,
      ),
    ).toEqual({
      href: '/dashboard/listings/new',
      rewardCredits: 5,
      referralCode: null,
      referralLink: null,
      referralCount: 0,
      credits: 0,
    })
  })
})

describe('getFirstTradeProgressReminder', () => {
  it('returns null when the member already completed the first-trade quest', () => {
    const result = getFirstTradeProgressReminder(
      [makeConversation({ id: 'conv-1' })],
      PROFILE_ID,
      true,
    )

    expect(result).toBeNull()
  })

  it('returns null when there are no active conversations', () => {
    const result = getFirstTradeProgressReminder(
      [makeConversation({ id: 'conv-1', last_message: null })],
      PROFILE_ID,
      false,
    )

    expect(result).toBeNull()
  })

  it('prefers the warmest unread conversation for the CTA', () => {
    const result = getFirstTradeProgressReminder(
      [
        makeConversation({
          id: 'conv-read',
          unread_count: 0,
        }),
        makeConversation({
          id: 'conv-unread',
          unread_count: 2,
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
                display_name: 'Sam',
                username: 'sam',
                avatar_url: null,
              },
            },
          ],
          last_message: {
            content: 'Ready when you are',
            created_at: '2026-05-12T09:00:00.000Z',
            sender_profile_id: 'profile-3',
            sender: {
              display_name: 'Sam',
              username: 'sam',
            },
          },
        }),
      ],
      PROFILE_ID,
      false,
    )

    expect(result).toEqual({
      conversationCount: 2,
      href: '/dashboard/messages/conv-unread',
      counterpartName: 'Sam',
      rewardCredits: 15,
    })
  })

  it('falls back to the most recent active conversation when none are unread', () => {
    const result = getFirstTradeProgressReminder(
      [
        makeConversation({
          id: 'conv-latest',
          unread_count: 0,
        }),
        makeConversation({
          id: 'conv-older',
          unread_count: 0,
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
            content: 'Trade soon?',
            created_at: '2026-05-10T09:00:00.000Z',
            sender_profile_id: 'profile-4',
            sender: {
              display_name: null,
              username: 'jules',
            },
          },
        }),
      ],
      PROFILE_ID,
      false,
    )

    expect(result).toEqual({
      conversationCount: 2,
      href: '/dashboard/messages/conv-latest',
      counterpartName: 'Alex',
      rewardCredits: 15,
    })
  })
})

describe('getSecondListingExpansionReminder', () => {
  it('returns null when onboarding is incomplete', () => {
    expect(getSecondListingExpansionReminder(null, [makeListing()], 1)).toBeNull()
  })

  it('returns null when the member has zero active listings', () => {
    expect(
      getSecondListingExpansionReminder(
        '2026-05-14T12:00:00.000Z',
        [makeListing({ status: 'paused' })],
        1,
      ),
    ).toBeNull()
  })

  it('returns null before the member has started a first conversation', () => {
    expect(
      getSecondListingExpansionReminder(
        '2026-05-14T12:00:00.000Z',
        [makeListing({ title: 'Vintage camera bundle' })],
        0,
      ),
    ).toBeNull()
  })

  it('returns null when the member already has multiple active listings', () => {
    expect(
      getSecondListingExpansionReminder(
        '2026-05-14T12:00:00.000Z',
        [
          makeListing({ id: 'listing-1', title: 'Camera kit' }),
          makeListing({ id: 'listing-2', title: 'Ceramic wheel' }),
        ],
        1,
      ),
    ).toBeNull()
  })

  it('returns a second-listing CTA when exactly one listing is active', () => {
    expect(
      getSecondListingExpansionReminder(
        '2026-05-14T12:00:00.000Z',
        [
          makeListing({ title: 'Vintage camera bundle' }),
          makeListing({ id: 'listing-paused', status: 'paused', title: 'Old guitar amp' }),
        ],
        2,
      ),
    ).toEqual({
      href: '/dashboard/listings/new',
      listingTitle: 'Vintage camera bundle',
    })
  })
})

describe('getFirstContactLaunchReminder', () => {
  it('returns null when onboarding is incomplete', () => {
    expect(getFirstContactLaunchReminder(null, [makeListing()], 0)).toBeNull()
  })

  it('returns null when the member has no active listings', () => {
    expect(
      getFirstContactLaunchReminder(
        '2026-05-14T12:00:00.000Z',
        [makeListing({ status: 'paused' })],
        0,
      ),
    ).toBeNull()
  })

  it('returns null once the member has already started a conversation', () => {
    expect(
      getFirstContactLaunchReminder(
        '2026-05-14T12:00:00.000Z',
        [makeListing()],
        1,
      ),
    ).toBeNull()
  })

  it('returns a first-contact CTA for onboarded members with active listings and zero conversations', () => {
    expect(
      getFirstContactLaunchReminder(
        '2026-05-14T12:00:00.000Z',
        [
          makeListing({ id: 'listing-1', title: 'Vintage camera bundle' }),
          makeListing({ id: 'listing-2', title: 'Ceramic kiln', status: 'paused' }),
        ],
        0,
      ),
    ).toEqual({
      href: '/directory',
      activeListingCount: 1,
      listingTitle: 'Vintage camera bundle',
    })
  })

  it('uses the active listing count when multiple listings are live', () => {
    expect(
      getFirstContactLaunchReminder(
        '2026-05-14T12:00:00.000Z',
        [
          makeListing({ id: 'listing-1', title: 'Vintage camera bundle' }),
          makeListing({ id: 'listing-2', title: 'Ceramic wheel' }),
        ],
        0,
      ),
    ).toEqual({
      href: '/directory',
      activeListingCount: 2,
      listingTitle: 'Vintage camera bundle',
    })
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

describe('getFreshListingReminder', () => {
  it('returns null when onboarding is incomplete', () => {
    expect(getFreshListingReminder(null, [makeListing()], new Date('2026-05-14T09:00:00.000Z'))).toBeNull()
  })

  it('returns null when the member has zero active listings', () => {
    expect(
      getFreshListingReminder(
        '2026-05-14T12:00:00.000Z',
        [makeListing({ status: 'paused' })],
        new Date('2026-05-14T09:00:00.000Z'),
      ),
    ).toBeNull()
  })

  it('returns null when the member has more than one active listing', () => {
    expect(
      getFreshListingReminder(
        '2026-05-14T12:00:00.000Z',
        [
          makeListing({ id: 'listing-1', title: 'Camera kit' }),
          makeListing({ id: 'listing-2', title: 'Ceramic wheel' }),
        ],
        new Date('2026-05-14T09:00:00.000Z'),
      ),
    ).toBeNull()
  })

  it('returns null when the member already created another listing that is no longer active', () => {
    expect(
      getFreshListingReminder(
        '2026-05-14T12:00:00.000Z',
        [
          makeListing({
            id: 'listing-1',
            title: 'Camera kit',
          }),
          makeListing({
            id: 'listing-2',
            title: 'Ceramic wheel',
            status: 'paused',
          }),
        ],
        new Date('2026-05-14T09:00:00.000Z'),
      ),
    ).toBeNull()
  })

  it('returns null when the only active listing is newer than 7 days', () => {
    expect(
      getFreshListingReminder(
        '2026-05-14T12:00:00.000Z',
        [
          makeListing({
            created_at: '2026-05-08T09:00:00.000Z',
            title: 'Vintage camera bundle',
          }),
        ],
        new Date('2026-05-14T09:00:00.000Z'),
      ),
    ).toBeNull()
  })

  it('returns a reminder when the only active listing is exactly 7 days old', () => {
    expect(
      getFreshListingReminder(
        '2026-05-14T12:00:00.000Z',
        [
          makeListing({
            created_at: '2026-05-07T09:00:00.000Z',
            title: 'Vintage camera bundle',
          }),
        ],
        new Date('2026-05-14T09:00:00.000Z'),
      ),
    ).toEqual({
      href: '/dashboard/listings/new',
      listingTitle: 'Vintage camera bundle',
      daysSincePublished: 7,
    })
  })

  it('returns a reminder when the only active listing is older than 7 days', () => {
    expect(
      getFreshListingReminder(
        '2026-05-14T12:00:00.000Z',
        [
          makeListing({
            created_at: '2026-04-20T09:00:00.000Z',
            title: 'Handmade desk',
          }),
        ],
        new Date('2026-05-14T09:00:00.000Z'),
      ),
    ).toEqual({
      href: '/dashboard/listings/new',
      listingTitle: 'Handmade desk',
      daysSincePublished: 24,
    })
  })

  it('counts days from created_at', () => {
    expect(
      getFreshListingReminder(
        '2026-05-14T12:00:00.000Z',
        [
          makeListing({
            created_at: '2026-05-01T09:00:00.000Z',
            updated_at: '2026-05-13T09:00:00.000Z',
            title: 'Recently updated item',
          }),
        ],
        new Date('2026-05-14T09:00:00.000Z'),
      ),
    ).toEqual({
      href: '/dashboard/listings/new',
      listingTitle: 'Recently updated item',
      daysSincePublished: 13,
    })
  })
})
