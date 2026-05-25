'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Zap, Check, X } from 'lucide-react'
import { captureClientEvent } from '@/lib/analytics-client'
import { BillingSavingsProofRow } from '@/components/dashboard/BillingSavingsProofRow'

interface ListingLimitUpsellModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  used: number
  limit: number
  premiumMonthlyPrice: string
  premiumAnnualSavings: string
}

export function ListingLimitUpsellModal({
  open,
  onOpenChange,
  used,
  limit,
  premiumMonthlyPrice,
  premiumAnnualSavings,
}: ListingLimitUpsellModalProps) {
  const [dismissed, setDismissed] = useState(false)

  function handleDismiss() {
    setDismissed(true)
    onOpenChange(false)
    captureClientEvent('upsell_modal_dismissed', {
      used,
      limit,
      premium_monthly_price: premiumMonthlyPrice,
      context: 'listing_limit',
    })
  }

  function handleUpgradeClick() {
    captureClientEvent('upsell_modal_clicked', {
      used,
      limit,
      premium_monthly_price: premiumMonthlyPrice,
      cta_location: 'upsell_modal',
      context: 'listing_limit',
    })
  }

  if (dismissed && !open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-7 w-7 text-amber-600" aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl font-serif text-forest-deep">
            You&apos;ve reached your listing limit
          </DialogTitle>
          <DialogDescription className="text-forest-mid">
            Free members can create up to {limit} listings. You&apos;ve used {used}.
            Upgrade to Premium for unlimited listings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-medium">Premium includes:</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>Unlimited listings</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>100 contacts per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>Verified badge on your profile</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>Featured placement in directory</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <div>
              <p className="font-semibold text-foreground">{premiumMonthlyPrice}/mo</p>
              <p className="text-xs text-muted-foreground">Annual billing saves {premiumAnnualSavings}</p>
            </div>
            <BillingSavingsProofRow />
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full h-11" onClick={handleUpgradeClick}>
              <Link href="/dashboard/billing">Upgrade to Premium</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-muted-foreground"
            >
              <X className="mr-1 h-4 w-4" />
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
