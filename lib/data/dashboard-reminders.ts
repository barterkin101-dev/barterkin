import type { ListingRow } from '@/lib/data/listings.types'
import type { ConversationRow } from '@/lib/data/messaging'

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
  const counterpart = topConversation.participants.find(
    (participant) => participant.profile_id !== currentProfileId,
  )

  return {
    unreadConversationCount: staleUnreadConversations.length,
    unreadMessageCount: staleUnreadConversations.reduce(
      (sum, conversation) => sum + conversation.unread_count,
      0,
    ),
    href: `/dashboard/messages/${topConversation.id}`,
    counterpartName:
      counterpart?.profile?.display_name
      ?? counterpart?.profile?.username
      ?? 'a member',
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
