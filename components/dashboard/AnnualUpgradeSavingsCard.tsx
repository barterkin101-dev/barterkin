'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { captureClientEvent } from '@/lib/analytics-client'
import type { DashboardAnnualUpgradeSavingsProps } from '@/lib/dashboard-annual-upgrade-savings'

export function AnnualUpgradeSavingsCard({
  premiumMonthlyPrice,
  premiumAnnualPrice,
  premiumAnnualSavings,
  annualEquivalentPrice,
}: DashboardAnnualUpgradeSavingsProps) {
  const trackedRef = useRef(false)

  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true

    captureClientEvent('annual_upgrade_savings_card_impression', {
      premium_monthly_price: premiumMonthlyPrice,
      premium_annual_price: premiumAnnualPrice,
      premium_annual_savings: premiumAnnualSavings,
      annual_equivalent_price: annualEquivalentPrice,
    })
  }, [annualEquivalentPrice, premiumAnnualPrice, premiumAnnualSavings, premiumMonthlyPrice])

  function handleClick() {
    captureClientEvent('annual_upgrade_savings_card_clicked', {
      premium_monthly_price: premiumMonthlyPrice,
      premium_annual_price: premiumAnnualPrice,
      premium_annual_savings: premiumAnnualSavings,
      annual_equivalent_price: annualEquivalentPrice,
    })
  }

  return (
    <Card className="border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,1),rgba(255,255,255,1))]">
      <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-emerald-950">
              Switch to annual Premium and keep the same perks for less.
            </p>
            <p className="max-w-3xl text-sm text-emerald-900/90">
              You&apos;re paying {premiumMonthlyPrice}/month today. Annual Premium is {premiumAnnualPrice}/year, works out to {annualEquivalentPrice}/month, and saves {premiumAnnualSavings} per year.
            </p>
          </div>
        </div>

        <Button asChild className="shrink-0" onClick={handleClick}>
          <Link href="/dashboard/billing">
            View annual upgrade
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
