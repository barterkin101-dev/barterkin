import Link from 'next/link'
import { ArrowRight, Camera, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { StaleListingReminder as StaleListingReminderData } from '@/lib/data/dashboard-reminders'

export function StaleListingReminder({
  reminder,
}: {
  reminder: StaleListingReminderData
}) {
  const listingLabel = reminder.staleListingCount === 1 ? 'listing' : 'listings'

  return (
    <Card className="border-amber-200 bg-amber-50/80">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-950">
            <Sparkles className="h-5 w-5 text-amber-700" />
            <h2 className="font-semibold">
              {reminder.staleListingCount} stale {listingLabel} needs a refresh
            </h2>
          </div>
          <p className="max-w-2xl text-sm text-amber-950/80">
            <span className="font-medium">{reminder.listingTitle}</span> has been live for more than 14
            days without a save. Refresh the photos or tighten the title to improve discovery.
          </p>
          <div className="flex items-center gap-2 text-xs text-amber-950/70">
            <Camera className="h-3.5 w-3.5" />
            <span>We&apos;ll open your oldest stale listing so you can update it fast.</span>
          </div>
        </div>

        <Link
          href={reminder.href}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'shrink-0 bg-amber-700 text-white hover:bg-amber-800',
          )}
        >
          Refresh listing
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
