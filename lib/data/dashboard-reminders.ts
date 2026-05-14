import type { ListingRow } from '@/lib/data/listings.types'
import type { ConversationRow } from '@/lib/data/messaging'
import { QUESTS } from '@/lib/quests'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

export interface UnreadMessageReminder {
  unreadConversationCount: number
  unreadMessageCount: number
  href: string
  counterpartName: string
  lastMessageAt: string
}

export interface StaleListingReminder {
  staleListingCount: number
  href: string
  listingTitle: string
  listingId: string
  staleSince: string
}

export interface DigestOptOutReminder {
  href: string
}

export interface OnboardingReturnReminder {
  href: string
}

export interface FirstTradeProgressReminder {
  conversationCount: number
  href: string
  counterpartName: string
  rewardCredits: number
}

export interface ZeroListingLaunchReminder {
  href: string
  rewardCredits: number | null
}

export interface SecondListingExpansionReminder {
  href: string
  listingTitle: string
}

export interface FirstContactLaunchReminder {
  href: string
  activeListingCount: number
  listingTitle: string
}

export function getUnreadMessageReminder(
  conversations: ConversationRow[],
  currentProfileId: string,
  now = new Date(),
): UnreadMessageReminder | null {
  const cutoff = now.getTime() - TWENTY_FOUR_HOURS_MS

  const staleUnreadConversations = conversations.filter((conversation): conversation is ConversationRow & {
    last_message: NonNullable<ConversationRow['last_message']>
  } => {
    if (conversation.unread_count <= 0 || !conversation.last_message) {
      return false
    }

    if (conversation.last_message.sender_profile_id === currentProfileId) {
      return false
    }

    return new Date(conversation.last_message.created_at).getTime() <= cutoff
  })

  if (staleUnreadConversations.length === 0) {
    return null
  }

  const topConversation = staleUnreadConversations[0]
  const counterpartName =
    topConversation.last_message.sender?.display_name
    ?? topConversation.last_message.sender?.username
    ?? 'a member'

  return {
    unreadConversationCount: staleUnreadConversations.length,
    unreadMessageCount: staleUnreadConversations.reduce(
      (sum, conversation) => sum + conversation.unread_count,
      0,
    ),
    href: `/dashboard/messages/${topConversation.id}`,
    counterpartName,
    lastMessageAt: topConversation.last_message.created_at,
  }
}

export function getStaleListingReminder(
  listings: ListingRow[],
  saveCounts: Record<string, number>,
  now = new Date(),
): StaleListingReminder | null {
  const cutoff = now.getTime() - FOURTEEN_DAYS_MS

  const staleListings = listings
    .filter((listing) => {
      if (listing.status !== 'active') {
        return false
      }

      if ((saveCounts[listing.id] ?? 0) > 0) {
        return false
      }

      const staleAt = new Date(listing.updated_at ?? listing.created_at).getTime()
      return staleAt <= cutoff
    })
    .sort(
      (left, right) =>
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
    )

  const oldestStaleListing = staleListings[0]
  if (!oldestStaleListing) {
    return null
  }

  return {
    staleListingCount: staleListings.length,
    href: `/dashboard/listings/${oldestStaleListing.id}/edit`,
    listingTitle: oldestStaleListing.title,
    listingId: oldestStaleListing.id,
    staleSince: oldestStaleListing.updated_at ?? oldestStaleListing.created_at,
  }
}

export function getDigestOptOutReminder(
  emailDigestEnabled: boolean | null | undefined,
  isPublished: boolean | null | undefined,
): DigestOptOutReminder | null {
  if (isPublished && emailDigestEnabled === false) {
    return { href: '/profile/edit' }
  }
  return null
}

export function getOnboardingReturnReminder(
  onboardingCompletedAt: string | null | undefined,
  skippedOnboarding: boolean,
): OnboardingReturnReminder | null {
  if (!onboardingCompletedAt && skippedOnboarding) {
    return { href: '/onboarding?step=1' }
  }

  return null
}

export function getFirstTradeProgressReminder(
  conversations: ConversationRow[],
  currentProfileId: string,
  hasCompletedFirstTradeQuest: boolean,
): FirstTradeProgressReminder | null {
  if (hasCompletedFirstTradeQuest) {
    return null
  }

  const activeConversations = conversations.filter((conversation) => conversation.last_message)
  if (activeConversations.length === 0) {
    return null
  }

  const topConversation = activeConversations.find((conversation) => conversation.unread_count > 0)
    ?? activeConversations[0]
  const counterpart = topConversation.participants.find(
    (participant) => participant.profile_id !== currentProfileId,
  )
  const counterpartName =
    counterpart?.profile?.display_name
    ?? counterpart?.profile?.username
    ?? topConversation.last_message?.sender?.display_name
    ?? topConversation.last_message?.sender?.username
    ?? 'a member'
  const rewardCredits = QUESTS.find((quest) => quest.key === 'quest_first_trade')?.credits ?? 15

  return {
    conversationCount: activeConversations.length,
    href: `/dashboard/messages/${topConversation.id}`,
    counterpartName,
    rewardCredits,
  }
}

export function getZeroListingLaunchReminder(
  onboardingCompletedAt: string | null | undefined,
  listings: ListingRow[],
  hasCompletedFirstListingQuest: boolean,
): ZeroListingLaunchReminder | null {
  if (!onboardingCompletedAt) {
    return null
  }

  const activeListingCount = listings.filter((listing) => listing.status === 'active').length
  if (activeListingCount > 0) {
    return null
  }

  const rewardCredits = !hasCompletedFirstListingQuest && listings.length === 0
    ? (QUESTS.find((quest) => quest.key === 'quest_first_listing')?.credits ?? 5)
    : null

  return {
    href: '/dashboard/listings/new',
    rewardCredits,
  }
}

export function getSecondListingExpansionReminder(
  onboardingCompletedAt: string | null | undefined,
  listings: ListingRow[],
): SecondListingExpansionReminder | null {
  if (!onboardingCompletedAt) {
    return null
  }

  const activeListings = listings.filter((listing) => listing.status === 'active')
  if (activeListings.length !== 1) {
    return null
  }

  return {
    href: '/dashboard/listings/new',
    listingTitle: activeListings[0].title,
  }
}

export function getFirstContactLaunchReminder(
  onboardingCompletedAt: string | null | undefined,
  listings: ListingRow[],
  conversationCount: number,
): FirstContactLaunchReminder | null {
  if (!onboardingCompletedAt || conversationCount > 0) {
    return null
  }

  const activeListings = listings.filter((listing) => listing.status === 'active')
  if (activeListings.length === 0) {
    return null
  }

  return {
    href: '/directory',
    activeListingCount: activeListings.length,
    listingTitle: activeListings[0].title,
  }
}
