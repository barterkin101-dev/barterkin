import Link from 'next/link'
import { ArrowRight, Rocket, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ZeroListingLaunchReminder as ZeroListingLaunchReminderData } from '@/lib/data/dashboard-reminders'

export function ZeroListingLaunchReminder({
  reminder,
}: {
  reminder: ZeroListingLaunchReminderData
}) {
  return (
    <Card className="border-sky-200 bg-sky-50/80">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sky-950">
            <Rocket className="h-5 w-5 text-sky-700" />
            <h2 className="font-semibold">Launch your first listing</h2>
          </div>
          <p className="max-w-2xl text-sm text-sky-950/80">
            {reminder.rewardCredits
              ? `Publish your first offer or service to start showing up in discovery and earn ${reminder.rewardCredits} quest credits automatically.`
              : 'Publish a fresh offer or service so members can discover you and start new trade conversations.'}
          </p>
          <div className="flex items-center gap-2 text-xs text-sky-950/70">
            <Sparkles className="h-3.5 w-3.5" />
            <span>One live listing is enough to give the marketplace something concrete to respond to.</span>
          </div>
        </div>

        <Link
          href={reminder.href}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'shrink-0 bg-sky-700 text-white hover:bg-sky-800',
          )}
        >
          Create listing
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
