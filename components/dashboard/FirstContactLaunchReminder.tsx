'use client'

import Link from 'next/link'
import { ArrowRight, Compass, MessageCircle, MessageSquareText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { captureClientEvent } from '@/lib/analytics-client'
import { buildSmsReferralShareUrl } from '@/lib/referral-share'
import { cn } from '@/lib/utils'
import type { FirstContactLaunchReminder as FirstContactLaunchReminderData } from '@/lib/data/dashboard-reminders'

export function FirstContactLaunchReminder({
  reminder,
}: {
  reminder: FirstContactLaunchReminderData
}) {
  const listingLabel = reminder.activeListingCount === 1 ? 'listing is' : 'listings are'
  const hasReferral = Boolean(reminder.referralCode && reminder.referralLink)

  function handleSmsShare() {
    if (!reminder.referralCode || !reminder.referralLink) return

    window.open(
      buildSmsReferralShareUrl(reminder.referralLink),
      '_blank',
      'noopener,noreferrer',
    )

    captureClientEvent('referral_invite_shared', {
      method: 'sms',
      referral_code: reminder.referralCode,
      referral_count: reminder.referralCount,
      credits: reminder.credits,
      share_surface: 'first_contact_launch',
    })
  }

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

        <div className="flex flex-col gap-2 sm:items-end">
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

          {hasReferral && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSmsShare}
              className="text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"
            >
              <MessageSquareText className="mr-1.5 h-3.5 w-3.5" />
              Text an invite first
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
