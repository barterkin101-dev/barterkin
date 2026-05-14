'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { captureClientEvent } from '@/lib/analytics-client'
import type { DashboardListingCapUpsellProps } from '@/lib/dashboard-listing-cap-upsell'

export function ListingCapUpsell({
  used,
  limit,
  remaining,
  premiumMonthlyPrice,
  premiumAnnualSavings,
}: DashboardListingCapUpsellProps) {
  const trackedRef = useRef(false)

  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true

    captureClientEvent('listing_cap_upgrade_nudge_impression', {
      used,
      limit,
      remaining,
      premium_monthly_price: premiumMonthlyPrice,
    })
  }, [limit, premiumMonthlyPrice, remaining, used])

  function handleClick() {
    captureClientEvent('listing_cap_upgrade_nudge_clicked', {
      used,
      limit,
      remaining,
      premium_monthly_price: premiumMonthlyPrice,
    })
  }

  return (
    <Card className="border-sky-200 bg-[linear-gradient(135deg,rgba(240,249,255,1),rgba(255,255,255,1))]">
      <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-sky-950">
              Your next listing fills your free cap ({used}/{limit} used).
            </p>
            <p className="max-w-3xl text-sm text-sky-900/90">
              You have {remaining} listing slot left. Upgrade to Premium from {premiumMonthlyPrice}/mo to remove the cap before your next post. Annual billing saves {premiumAnnualSavings}.
            </p>
          </div>
        </div>

        <Button asChild className="shrink-0" onClick={handleClick}>
          <Link href="/dashboard/billing">
            Unlock unlimited listings
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
