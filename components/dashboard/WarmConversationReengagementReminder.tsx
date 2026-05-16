'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { ArrowRight, Clock3, Send } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { captureClientEvent } from '@/lib/analytics-client'
import type { WarmConversationReengagementReminder as WarmConversationReengagementReminderData } from '@/lib/data/dashboard-reminders'
import { cn } from '@/lib/utils'

export function WarmConversationReengagementReminder({
  reminder,
}: {
  reminder: WarmConversationReengagementReminderData
}) {
  const conversationLabel = reminder.staleConversationCount === 1
    ? 'conversation'
    : 'conversations'
  const trackedRef = useRef(false)

  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true
    captureClientEvent('warm_conversation_reengagement_reminder_impression', {
      stale_conversation_count: reminder.staleConversationCount,
    })
  }, [reminder.staleConversationCount])

  function handleClick() {
    captureClientEvent('warm_conversation_reengagement_reminder_clicked', {
      stale_conversation_count: reminder.staleConversationCount,
    })
  }

  return (
    <Card className="border-orange-200 bg-orange-50/80">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-orange-950">
            <Send className="h-5 w-5 text-orange-700" />
            <h2 className="font-semibold">Your follow-up has been sitting for 3+ days</h2>
          </div>
          <p className="max-w-2xl text-sm text-orange-950/80">
            You have {reminder.staleConversationCount} warm {conversationLabel} where your last message has been sitting for at least three days. Check back in with {reminder.counterpartName} before the trade loses momentum.
          </p>
          <div className="flex items-center gap-2 text-xs text-orange-950/70">
            <Clock3 className="h-3.5 w-3.5" />
            <span>A quick follow-up often gets a stalled barter moving again.</span>
          </div>
        </div>

        <Link
          href={reminder.href}
          onClick={handleClick}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'shrink-0 bg-orange-700 text-white hover:bg-orange-800',
          )}
        >
          Send a follow-up
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
