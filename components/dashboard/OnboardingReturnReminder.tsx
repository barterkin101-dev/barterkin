import Link from 'next/link'
import { ArrowRight, Sparkles, Undo2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OnboardingReturnReminder as OnboardingReturnReminderData } from '@/lib/data/dashboard-reminders'

export function OnboardingReturnReminder({
  reminder,
}: {
  reminder: OnboardingReturnReminderData
}) {
  return (
    <Card className="border-amber-200 bg-amber-50/80">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-950">
            <Undo2 className="h-5 w-5 text-amber-700" />
            <h2 className="font-semibold">Finish setting up your Barterkin profile</h2>
          </div>
          <p className="max-w-2xl text-sm text-amber-950/80">
            You skipped setup earlier. Jump back in to finish your profile, browse the directory,
            and start sending intros with less friction.
          </p>
          <div className="flex items-center gap-2 text-xs text-amber-950/70">
            <Sparkles className="h-3.5 w-3.5" />
            <span>It only takes a minute to get your account fully marketplace-ready.</span>
          </div>
        </div>

        <Link
          href={reminder.href}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'shrink-0 bg-amber-700 text-white hover:bg-amber-800',
          )}
        >
          Return to onboarding
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
