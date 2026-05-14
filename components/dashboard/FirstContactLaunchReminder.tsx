import Link from 'next/link'
import { ArrowRight, Compass, MessageCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FirstContactLaunchReminder as FirstContactLaunchReminderData } from '@/lib/data/dashboard-reminders'

export function FirstContactLaunchReminder({
  reminder,
}: {
  reminder: FirstContactLaunchReminderData
}) {
  const listingLabel = reminder.activeListingCount === 1 ? 'listing is' : 'listings are'

  return (
    <Card className="border-emerald-200 bg-emerald-50/90">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-950">
            <MessageCircle className="h-5 w-5 text-emerald-700" />
            <h2 className="font-semibold">Start your first trade conversation</h2>
          </div>
          <p className="max-w-2xl text-sm text-emerald-950/80">
            Your {listingLabel} live, but nobody can reply until you open the first thread. Lead with
            {` "${reminder.listingTitle}"`} in the directory and invite a member to trade.
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-950/70">
            <Compass className="h-3.5 w-3.5" />
            <span>One strong outreach is enough to turn a listing into an active barter conversation.</span>
          </div>
        </div>

        <Link
          href={reminder.href}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'shrink-0 bg-emerald-700 text-white hover:bg-emerald-800',
          )}
        >
          Browse members
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
