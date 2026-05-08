'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConversationThread } from '@/components/messaging/ConversationThread'
import { MessageComposer } from '@/components/messaging/MessageComposer'
import type { MessageRow } from '@/lib/data/messaging'

export default function MessageThreadPage() {
  const params = useParams()
  const conversationId = String(params.id)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [currentProfileId, setCurrentProfileId] = useState<string>('')
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
      const { data } = await supabase
        .from('messages')
        .select(
          `id, conversation_id, sender_profile_id, content, created_at,
           profiles!inner(id, display_name, username, avatar_url)`,
        )
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (data) {
        setMessages(
          data.map((m) => ({
            id: m.id,
            conversation_id: m.conversation_id,
            sender_profile_id: m.sender_profile_id,
            content: m.content,
            created_at: m.created_at,
            sender: m.profiles as unknown as MessageRow['sender'],
          })),
        )
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
      <MessageComposer conversationId={conversationId} />
    </div>
  )
}
