'use client'

import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { ConversationRow } from '@/lib/data/messaging'

export function ConversationList({
  conversations,
  activeId,
  currentProfileId,
}: {
  conversations: ConversationRow[]
  activeId?: string
  currentProfileId: string
}) {
  if (conversations.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No conversations yet.
      </div>
    )
  }

  return (
    <div className="divide-y">
      {conversations.map((conv) => {
        const otherParticipant = conv.participants.find(
          (p) => p.profile_id !== currentProfileId
        )
        const isActive = conv.id === activeId

        return (
          <Link
            key={conv.id}
            href={`/dashboard/messages/${conv.id}`}
            className={cn(
              'flex items-center gap-3 px-4 py-3 transition-colors',
              isActive ? 'bg-muted' : 'hover:bg-muted/50',
            )}
          >
            {otherParticipant?.profile?.avatar_url ? (
              <Image
                src={otherParticipant.profile.avatar_url}
                alt={otherParticipant.profile.display_name ?? ''}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="truncate text-sm font-medium">
                  {otherParticipant?.profile?.display_name ??
                    otherParticipant?.profile?.username ??
                    'Member'}
                </span>
                {conv.unread_count > 0 && (
                  <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                    {conv.unread_count}
                  </span>
                )}
              </div>
              {conv.last_message && (
                <p className="truncate text-sm text-muted-foreground">
                  {conv.last_message.content}
                </p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
