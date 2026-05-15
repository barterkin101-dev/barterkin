'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { ArrowRight, Clock3, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { captureClientEvent } from '@/lib/analytics-client'
import type { UnreadMessageReminder as UnreadMessageReminderData } from '@/lib/data/dashboard-reminders'

export function UnreadMessageReminder({
  reminder,
}: {
  reminder: UnreadMessageReminderData
}) {
  const conversationLabel = reminder.unreadConversationCount === 1
    ? 'conversation'
    : 'conversations'
  const messageLabel = reminder.unreadMessageCount === 1 ? 'message' : 'messages'
  const isTwoDayReminder = reminder.staleTier === 'two-day'
  const replyTargetLabel = reminder.counterpartName === 'a member'
    ? 'this member'
    : reminder.counterpartName
  const replyCtaLabel = isTwoDayReminder
    ? `Reply to ${replyTargetLabel} now`
    : `Reply to ${replyTargetLabel}`
  const trackedRef = useRef(false)

  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true
    captureClientEvent('unread_message_reminder_impression', {
      stale_tier: reminder.staleTier,
      unread_conversation_count: reminder.unreadConversationCount,
      unread_message_count: reminder.unreadMessageCount,
    })
  }, [reminder.staleTier, reminder.unreadConversationCount, reminder.unreadMessageCount])

  function handleClick() {
    captureClientEvent('unread_message_reminder_clicked', {
      stale_tier: reminder.staleTier,
      unread_conversation_count: reminder.unreadConversationCount,
      unread_message_count: reminder.unreadMessageCount,
    })
  }

  return (
    <Card className="border-sky-200 bg-sky-50/80">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sky-900">
            <MessageSquare className="h-5 w-5 text-sky-700" />
            <h2 className="font-semibold">
              {reminder.unreadMessageCount} unread {messageLabel} waiting
            </h2>
          </div>
          <p className="max-w-2xl text-sm text-sky-900/80">
            You have {reminder.unreadConversationCount} unread {conversationLabel} untouched for more
            than {isTwoDayReminder ? '48' : '24'} hours. {reminder.counterpartName} is still waiting for a reply.
          </p>
          <p className="max-w-2xl text-sm font-medium text-sky-900/90">
            {reminder.counterpartName} sent the last message over {isTwoDayReminder ? '48' : '24'} hours ago.
            {isTwoDayReminder
              ? ' Reply now to keep this trade alive.'
              : ' A quick reply keeps this trade moving.'}
          </p>
          <div className="flex items-center gap-2 text-xs text-sky-900/70">
            <Clock3 className="h-3.5 w-3.5" />
            <span>
              {isTwoDayReminder
                ? 'Keep the barter moving before momentum slips.'
                : 'Jump back into the thread before the trade goes cold.'}
            </span>
          </div>
        </div>

        <Link
          href={reminder.href}
          onClick={handleClick}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'shrink-0 bg-sky-700 text-white hover:bg-sky-800',
          )}
        >
          {replyCtaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
