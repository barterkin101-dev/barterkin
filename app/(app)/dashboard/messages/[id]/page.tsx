'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConversationThread } from '@/components/messaging/ConversationThread'
import { MessageComposer } from '@/components/messaging/MessageComposer'
import { TradeCompletionPanel } from '@/components/messaging/TradeCompletionPanel'
import type { MessageRow } from '@/lib/data/messaging'
import type { Database } from '@/lib/database.types'

type TradeCompletionRow = Database['public']['Tables']['trade_completions']['Row']

function getActorStatus(
  tradeCompletion: Pick<
    TradeCompletionRow,
    'status' | 'initiator_profile_id' | 'recipient_profile_id' | 'initiator_marked_at' | 'recipient_marked_at'
  > | null,
  profileId: string,
): 'idle' | 'marked' | 'waiting' | 'completed' {
  if (!tradeCompletion || tradeCompletion.status === 'pending') return 'idle'
  if (tradeCompletion.status === 'completed') return 'completed'

  const iAmInitiator = tradeCompletion.initiator_profile_id === profileId
  const iAmRecipient = tradeCompletion.recipient_profile_id === profileId
  if (!iAmInitiator && !iAmRecipient) return 'idle'

  const iMarked = iAmInitiator
    ? !!tradeCompletion.initiator_marked_at
    : !!tradeCompletion.recipient_marked_at

  return iMarked ? 'marked' : 'waiting'
}

export default function MessageThreadPage() {
  const params = useParams()
  const conversationId = String(params.id)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
  const [otherProfileId, setOtherProfileId] = useState<string>('')
  const [otherDisplayName, setOtherDisplayName] = useState<string>('')
  const [listingId, setListingId] = useState<string | null>(null)
  const [actorStatus, setActorStatus] = useState<'idle' | 'marked' | 'waiting' | 'completed'>('idle')
  const [hasReviewed, setHasReviewed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      // Get current profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (profile) setCurrentProfileId(profile.id)

      // Load messages
      const { data: msgData } = await supabase
        .from('messages')
        .select(
          `id, conversation_id, sender_profile_id, content, created_at,
           profiles!inner(id, display_name, username, avatar_url)`,
        )
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (msgData) {
        setMessages(
          msgData.map((m) => ({
            id: m.id,
            conversation_id: m.conversation_id,
            sender_profile_id: m.sender_profile_id,
            content: m.content,
            created_at: m.created_at,
            sender: m.profiles as unknown as MessageRow['sender'],
          })),
        )
      }

      // Load conversation metadata
      const { data: convData } = await supabase
        .from('conversations')
        .select('listing_id')
        .eq('id', conversationId)
        .maybeSingle()
      if (convData) setListingId(convData.listing_id)

      // Load other participant
      if (profile) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('profile_id, profiles!inner(display_name)')
          .eq('conversation_id', conversationId)
          .neq('profile_id', profile.id)

        const other = (participants as unknown as { profile_id: string; profiles: { display_name: string | null } }[] | null)?.[0]
        if (other) {
          setOtherProfileId(other.profile_id)
          setOtherDisplayName(other.profiles.display_name ?? 'the other member')
          const { data: tcData } = await supabase
            .from('trade_completions')
            .select('status, initiator_profile_id, recipient_profile_id, initiator_marked_at, recipient_marked_at')
            .eq('conversation_id', conversationId)
            .maybeSingle()
          setActorStatus(getActorStatus(tcData, profile.id))

          const { data: ratingData } = await supabase
            .from('ratings')
            .select('id')
            .eq('rater_profile_id', profile.id)
            .eq('ratee_profile_id', other.profile_id)
            .eq('conversation_id', conversationId)
            .maybeSingle()
          setHasReviewed(!!ratingData)
        } else {
          setActorStatus('idle')
          setHasReviewed(false)
        }
      }

      setLoading(false)

      // Mark as read
      if (profile) {
        await supabase
          .from('conversation_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('profile_id', profile.id)
      }
    }

    load()

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as MessageRow
          setMessages((prev) => [...prev, newMessage])
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [conversationId])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col">
      <div className="flex-1 overflow-y-auto px-4">
        <ConversationThread messages={messages} currentProfileId={currentProfileId} />
      </div>
      <TradeCompletionPanel
        conversationId={conversationId}
        actorStatus={actorStatus}
        otherProfileId={otherProfileId}
        otherDisplayName={otherDisplayName}
        listingId={listingId}
        hasReviewed={hasReviewed}
      />
      <MessageComposer conversationId={conversationId} />
    </div>
  )
}
