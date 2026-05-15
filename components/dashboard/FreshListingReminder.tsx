import Link from 'next/link'
import { ArrowRight, CalendarClock, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FreshListingReminder as FreshListingReminderData } from '@/lib/data/dashboard-reminders'

export function FreshListingReminder({
  reminder,
}: {
  reminder: FreshListingReminderData
}) {
  return (
    <Card className="border-amber-200 bg-amber-50/80">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-950">
            <CalendarClock className="h-5 w-5 text-amber-700" />
            <h2 className="font-semibold">Keep your profile visible</h2>
          </div>
          <p className="max-w-2xl text-sm text-amber-950/80">
            {`"${reminder.listingTitle}" has been live for ${reminder.daysSincePublished} days. Adding a fresh listing helps you stay discoverable and gives members another reason to reach out.`}
          </p>
          <div className="flex items-center gap-2 text-xs text-amber-950/70">
            <Sparkles className="h-3.5 w-3.5" />
            <span>New listings get a small boost in search and directory placement.</span>
          </div>
        </div>

        <Link
          href={reminder.href}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'shrink-0 bg-amber-700 text-white hover:bg-amber-800',
          )}
        >
          Add fresh listing
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
