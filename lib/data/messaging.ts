import 'server-only'
import { createClient } from '@/lib/supabase/server'

export interface ConversationRow {
  id: string
  listing_id: string | null
  created_at: string
  updated_at: string
  participants: {
    profile_id: string
    last_read_at: string | null
    profile: {
      id: string
      display_name: string | null
      username: string | null
      avatar_url: string | null
    } | null
  }[]
  last_message: {
    content: string
    created_at: string
    sender_profile_id: string
  } | null
  unread_count: number
}

export interface MessageRow {
  id: string
  conversation_id: string
  sender_profile_id: string
  content: string
  created_at: string
  sender: {
    id: string
    display_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

export async function getConversations(profileId: string): Promise<ConversationRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conversation_participants')
    .select(
      `conversation_id,
       conversations!inner(id, listing_id, created_at, updated_at),
       profile_id,
       last_read_at`,
    )
    .eq('profile_id', profileId)
    .order('conversations(updated_at)', { ascending: false })

  if (error) {
    console.error('[getConversations] error', { code: error.code })
    return []
  }

  const conversationIds = (data ?? []).map((d) => d.conversation_id)
  if (conversationIds.length === 0) return []

  // Fetch all participants for these conversations
  const { data: allParticipants, error: partErr } = await supabase
    .from('conversation_participants')
    .select(
      `conversation_id, profile_id, last_read_at,
       profiles!inner(id, display_name, username, avatar_url)`,
    )
    .in('conversation_id', conversationIds)

  if (partErr) {
    console.error('[getConversations] participants error', { code: partErr.code })
  }

  // Fetch last messages
  const { data: lastMessages, error: msgErr } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_profile_id, content, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })

  if (msgErr) {
    console.error('[getConversations] messages error', { code: msgErr.code })
  }

  // Fetch unread counts
  const { data: unreadData, error: unreadErr } = await supabase
    .from('messages')
    .select('conversation_id, sender_profile_id, created_at')
    .in('conversation_id', conversationIds)

  if (unreadErr) {
    console.error('[getConversations] unread error', { code: unreadErr.code })
  }

  const participantsByConv: Record<string, ConversationRow['participants']> = {}
  for (const p of (allParticipants ?? [])) {
    if (!participantsByConv[p.conversation_id]) participantsByConv[p.conversation_id] = []
    participantsByConv[p.conversation_id].push({
      profile_id: p.profile_id,
      last_read_at: p.last_read_at,
      profile: p.profiles as unknown as ConversationRow['participants'][0]['profile'],
    })
  }

  const lastMessageByConv: Record<string, ConversationRow['last_message']> = {}
  for (const m of (lastMessages ?? [])) {
    if (!lastMessageByConv[m.conversation_id]) {
      lastMessageByConv[m.conversation_id] = {
        content: m.content,
        created_at: m.created_at,
        sender_profile_id: m.sender_profile_id,
      }
    }
  }

  // Calculate unread count per conversation
  const unreadByConv: Record<string, number> = {}
  const myParticipantMap: Record<string, string | null> = {}
  for (const p of (allParticipants ?? [])) {
    if (p.profile_id === profileId) {
      myParticipantMap[p.conversation_id] = p.last_read_at
    }
  }
  for (const m of (unreadData ?? [])) {
    if (m.sender_profile_id === profileId) continue
    const lastRead = myParticipantMap[m.conversation_id]
    if (!lastRead || new Date(m.created_at) > new Date(lastRead)) {
      unreadByConv[m.conversation_id] = (unreadByConv[m.conversation_id] ?? 0) + 1
    }
  }

  return (data ?? []).map((d) => ({
    id: d.conversation_id,
    listing_id: (d.conversations as unknown as { listing_id: string | null }).listing_id,
    created_at: (d.conversations as unknown as { created_at: string }).created_at,
    updated_at: (d.conversations as unknown as { updated_at: string }).updated_at,
    participants: participantsByConv[d.conversation_id] ?? [],
    last_message: lastMessageByConv[d.conversation_id] ?? null,
    unread_count: unreadByConv[d.conversation_id] ?? 0,
  }))
}

export async function getMessages(conversationId: string): Promise<MessageRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select(
      `id, conversation_id, sender_profile_id, content, created_at,
       profiles!inner(id, display_name, username, avatar_url)`,
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getMessages] error', { code: error.code })
    return []
  }

  return (data ?? []).map((m) => ({
    id: m.id,
    conversation_id: m.conversation_id,
    sender_profile_id: m.sender_profile_id,
    content: m.content,
    created_at: m.created_at,
    sender: m.profiles as unknown as MessageRow['sender'],
  }))
}

export async function getConversationById(conversationId: string, profileId: string): Promise<ConversationRow | null> {
  const supabase = await createClient()

  const { data: participant, error: partErr } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('conversation_id', conversationId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (partErr || !participant) return null

  const conversations = await getConversations(profileId)
  return conversations.find((c) => c.id === conversationId) ?? null
}
