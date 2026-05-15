import Link from 'next/link'
import { ArrowRight, Eye, PencilLine } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ViewedListingRevisitReminder as ViewedListingRevisitReminderData } from '@/lib/data/dashboard-reminders'

export function ViewedListingRevisitReminder({
  reminder,
}: {
  reminder: ViewedListingRevisitReminderData
}) {
  const viewLabel = reminder.profileViewCount === 1 ? 'view' : 'views'

  return (
    <Card className="border-orange-200 bg-orange-50/85">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-orange-950">
            <PencilLine className="h-5 w-5 text-orange-700" />
            <h2 className="font-semibold">Turn profile traffic into saves</h2>
          </div>
          <p className="max-w-2xl text-sm text-orange-950/80">
            {`"${reminder.listingTitle}" has been live for ${reminder.daysSincePublished} days with ${reminder.profileViewCount} profile ${viewLabel}, but no saves yet. Tighten the photos, title, or trade terms so interested members have a clearer reason to reach out.`}
          </p>
          <div className="flex items-center gap-2 text-xs text-orange-950/70">
            <Eye className="h-3.5 w-3.5" />
            <span>We&apos;ll open your live listing directly so you can revise it in one step.</span>
          </div>
        </div>

        <Link
          href={reminder.href}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'shrink-0 bg-orange-700 text-white hover:bg-orange-800',
          )}
        >
          Rework listing
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
