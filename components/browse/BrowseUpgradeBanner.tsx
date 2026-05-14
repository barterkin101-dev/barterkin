'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureClientEvent } from '@/lib/analytics-client'
import type { BrowseUpgradeBannerProps } from '@/lib/browse-upgrade-banner'

export function BrowseUpgradeBanner({
  placement,
  used,
  limit,
  premiumMonthlyPrice,
  premiumAnnualSavings,
  premiumContactLimit,
  extraContactCapacity,
  extraContactCostPerSlot,
}: BrowseUpgradeBannerProps) {
  const trackedRef = useRef(false)

  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true

    captureClientEvent('contact_limit_upgrade_banner_impression', {
      placement,
      used,
      limit,
      premium_contact_limit: premiumContactLimit,
      premium_monthly_price: premiumMonthlyPrice,
    })
  }, [limit, placement, premiumContactLimit, premiumMonthlyPrice, used])

  function handleClick() {
    captureClientEvent('contact_limit_upgrade_banner_clicked', {
      placement,
      used,
      limit,
      premium_contact_limit: premiumContactLimit,
      premium_monthly_price: premiumMonthlyPrice,
    })
  }

  return (
    <section className="sticky top-20 z-10 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-background px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-amber-950">
                You&apos;ve used all {used}/{limit} free contact starts this month.
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                <Sparkles className="h-3.5 w-3.5" />
                Premium unlocks {premiumContactLimit}/mo
              </span>
            </div>
            <p className="max-w-3xl text-sm text-amber-900/90">
              Upgrade from {premiumMonthlyPrice}/mo to add {extraContactCapacity} more conversation starts this month,
              about {extraContactCostPerSlot} per extra slot. Annual billing saves {premiumAnnualSavings}.
            </p>
          </div>
        </div>

        <Button asChild className="shrink-0" onClick={handleClick}>
          <Link href="/dashboard/billing">
            See Premium plans
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
