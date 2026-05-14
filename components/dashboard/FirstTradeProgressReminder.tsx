import Link from 'next/link'
import { ArrowRight, Sparkles, Trophy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FirstTradeProgressReminder as FirstTradeProgressReminderData } from '@/lib/data/dashboard-reminders'

export function FirstTradeProgressReminder({
  reminder,
}: {
  reminder: FirstTradeProgressReminderData
}) {
  const conversationLabel = reminder.conversationCount === 1
    ? 'conversation'
    : 'conversations'

  return (
    <Card className="border-amber-200 bg-amber-50/90">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-950">
            <Trophy className="h-5 w-5 text-amber-700" />
            <h2 className="font-semibold">
              Finish your first trade and earn {reminder.rewardCredits} credits
            </h2>
          </div>
          <p className="max-w-2xl text-sm text-amber-950/80">
            You already have {reminder.conversationCount} active {conversationLabel}. Pick back up with
            {` ${reminder.counterpartName}`} and turn that momentum into your first completed trade.
          </p>
          <div className="flex items-center gap-2 text-xs text-amber-950/70">
            <Sparkles className="h-3.5 w-3.5" />
            <span>The reward lands automatically once both sides mark the trade complete.</span>
          </div>
        </div>

        <Link
          href={reminder.href}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'shrink-0 bg-amber-600 text-white hover:bg-amber-700',
          )}
        >
          Open conversation
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
