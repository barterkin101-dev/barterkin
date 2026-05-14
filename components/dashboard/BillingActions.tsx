'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { LoaderCircle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BILLING_PLAN_AMOUNTS, formatUsdFromCents, getPremiumAnnualSavings } from '@/lib/stripe/config'
import { Button } from '@/components/ui/button'

type BillingActionType = 'checkout-premium' | 'checkout-founding' | 'portal' | null
type PremiumInterval = 'annual' | 'monthly'

export function BillingActions({
  canManageBilling,
  tier,
  foundingAvailable,
}: {
  canManageBilling: boolean
  tier: string
  foundingAvailable: boolean
}) {
  const [pendingAction, setPendingAction] = useState<BillingActionType>(null)
  const [premiumInterval, setPremiumInterval] = useState<PremiumInterval>('annual')

  async function startBillingFlow(
    endpoint: string,
    action: Exclude<BillingActionType, null>,
    body?: Record<string, unknown>,
  ) {
    try {
      setPendingAction(action)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(body ?? {}),
      })

      const payload = await response.json().catch(() => null) as
        | { ok?: boolean; error?: string; url?: string }
        | null

      if (!response.ok || !payload?.ok || !payload.url) {
        throw new Error(payload?.error ?? 'Unable to start billing flow.')
      }

      window.location.assign(payload.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to start billing flow.')
      setPendingAction(null)
    }
  }

  const isPaid = tier === 'premium' || tier === 'founding'
  const premiumPending = pendingAction === 'checkout-premium'
  const foundingPending = pendingAction === 'checkout-founding'
  const portalPending = pendingAction === 'portal'
  const anyPending = pendingAction !== null
  const annualSavings = getPremiumAnnualSavings()
  const premiumMonthlyLabel = `${formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumMonthlyCents)}/month`
  const premiumAnnualLabel = `${formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumAnnualCents)}/year`
  const foundingMonthlyLabel = `${formatUsdFromCents(BILLING_PLAN_AMOUNTS.foundingMonthlyCents)}/month`
  const annualSavingsLabel = formatUsdFromCents(annualSavings.totalSavingsCents)

  // Paid users only see portal
  if (isPaid) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={!canManageBilling || anyPending}
          onClick={() => startBillingFlow('/api/stripe/customer-portal', 'portal')}
        >
          {portalPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Manage Billing
        </Button>
      </div>
    )
  }

  // Free users see upgrade options
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-primary/15 bg-primary/5 p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            className={cn(
              'rounded-lg px-4 py-3 text-left transition',
              premiumInterval === 'annual'
                ? 'bg-background shadow-sm ring-1 ring-primary/15'
                : 'text-muted-foreground hover:bg-background/70',
            )}
            onClick={() => setPremiumInterval('annual')}
            disabled={anyPending}
          >
            <span className="block text-sm font-semibold text-foreground">Annual</span>
            <span className="block text-xs text-muted-foreground">{premiumAnnualLabel}</span>
            <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
              Save {annualSavingsLabel}
            </span>
          </button>
          <button
            type="button"
            className={cn(
              'rounded-lg px-4 py-3 text-left transition',
              premiumInterval === 'monthly'
                ? 'bg-background shadow-sm ring-1 ring-primary/15'
                : 'text-muted-foreground hover:bg-background/70',
            )}
            onClick={() => setPremiumInterval('monthly')}
            disabled={anyPending}
          >
            <span className="block text-sm font-semibold text-foreground">Monthly</span>
            <span className="block text-xs text-muted-foreground">{premiumMonthlyLabel}</span>
            <span className="mt-1 inline-flex px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Flexible billing
            </span>
          </button>
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        disabled={anyPending}
        onClick={() =>
          startBillingFlow('/api/stripe/checkout-session', 'checkout-premium', {
            priceId: premiumInterval === 'annual' ? 'annual' : 'premium',
          })
        }
      >
        {premiumPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {premiumInterval === 'annual'
          ? `Upgrade to Premium Annual — ${formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumAnnualCents)}/yr`
          : `Upgrade to Premium — ${formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumMonthlyCents)}/mo`}
      </Button>

      {foundingAvailable && (
        <Button
          id="founding-checkout"
          type="button"
          size="lg"
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          disabled={anyPending}
          onClick={() =>
            startBillingFlow('/api/stripe/checkout-session', 'checkout-founding', {
              priceId: 'founding',
            })
          }
        >
          {foundingPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          <Zap className="mr-2 size-4" />
          Claim Founding Member — {formatUsdFromCents(BILLING_PLAN_AMOUNTS.foundingMonthlyCents)}/mo
        </Button>
      )}
    </div>
  )
}
