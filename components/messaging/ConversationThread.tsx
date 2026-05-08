'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { MessageRow } from '@/lib/data/messaging'

export function ConversationThread({
  messages,
  currentProfileId,
}: {
  messages: MessageRow[]
  currentProfileId: string
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No messages yet. Start the conversation!
      </div>
    )
  }

  return (
    <div className="space-y-4 py-4">
      {messages.map((msg) => {
        const isMe = msg.sender_profile_id === currentProfileId
        return (
          <div
            key={msg.id}
            className={cn('flex gap-3', isMe ? 'flex-row-reverse' : 'flex-row')}
          >
            {msg.sender?.avatar_url ? (
              <Image
                src={msg.sender.avatar_url}
                alt={msg.sender.display_name ?? ''}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted" />
            )}
            <div
              className={cn(
                'max-w-[70%] rounded-2xl px-4 py-2',
                isMe
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground',
              )}
            >
              <p className="text-sm">{msg.content}</p>
              <p
                className={cn(
                  'mt-1 text-xs',
                  isMe ? 'text-primary-foreground/70' : 'text-muted-foreground',
                )}
              >
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
