import type { ConversationRow } from '@/lib/data/messaging'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export interface UnreadMessageReminder {
  unreadConversationCount: number
  unreadMessageCount: number
  href: string
  counterpartName: string
  lastMessageAt: string
}

export function getUnreadMessageReminder(
  conversations: ConversationRow[],
  currentProfileId: string,
  now = new Date(),
): UnreadMessageReminder | null {
  const cutoff = now.getTime() - TWENTY_FOUR_HOURS_MS

  const staleUnreadConversations = conversations.filter((conversation) => {
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
