'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { captureClientEvent } from '@/lib/analytics-client'
import type { PostContactUpgradeNudgeProps } from '@/lib/post-contact-upgrade-nudge'

export function PostContactUpgradeNudge({
  used,
  limit,
  remaining,
  premiumMonthlyPrice,
  premiumAnnualSavings,
  premiumContactLimit,
}: PostContactUpgradeNudgeProps) {
  const trackedRef = useRef(false)

  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true

    captureClientEvent('post_contact_upgrade_nudge_impression', {
      used,
      limit,
      remaining,
      premium_contact_limit: premiumContactLimit,
      premium_monthly_price: premiumMonthlyPrice,
    })
  }, [limit, premiumContactLimit, premiumMonthlyPrice, remaining, used])

  function handleClick() {
    captureClientEvent('post_contact_upgrade_nudge_clicked', {
      used,
      limit,
      remaining,
      premium_contact_limit: premiumContactLimit,
      premium_monthly_price: premiumMonthlyPrice,
    })
  }

  return (
    <Card className="border-amber-300 bg-[linear-gradient(135deg,rgba(255,247,237,1),rgba(255,255,255,1))]">
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-amber-950">
              {remaining === 0
                ? `That outreach used your last free contact start this month (${used}/${limit}).`
                : `You have ${remaining} free contact start left this month (${used}/${limit}).`}
            </p>
            <p className="max-w-3xl text-sm text-amber-900/90">
              Upgrade to Premium from {premiumMonthlyPrice}/mo to unlock {premiumContactLimit} conversation starts per month. Annual billing saves {premiumAnnualSavings}.
            </p>
          </div>
        </div>

        <Button asChild className="shrink-0" onClick={handleClick}>
          <Link href="/dashboard/billing">
            See Premium plans
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
