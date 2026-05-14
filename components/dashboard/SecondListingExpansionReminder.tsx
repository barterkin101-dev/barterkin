import Link from 'next/link'
import { ArrowRight, Layers3, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SecondListingExpansionReminder as SecondListingExpansionReminderData } from '@/lib/data/dashboard-reminders'

export function SecondListingExpansionReminder({
  reminder,
}: {
  reminder: SecondListingExpansionReminderData
}) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/80">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-950">
            <Layers3 className="h-5 w-5 text-emerald-700" />
            <h2 className="font-semibold">Broaden your trade coverage</h2>
          </div>
          <p className="max-w-2xl text-sm text-emerald-950/80">
            {`"${reminder.listingTitle}" is live. Add a second listing so you can show up in more searches, reach different barter partners, and give members another reason to start a conversation.`}
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-950/70">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Two active listings usually tell a clearer story about what you can trade.</span>
          </div>
        </div>

        <Link
          href={reminder.href}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'shrink-0 bg-emerald-700 text-white hover:bg-emerald-800',
          )}
        >
          Add second listing
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
