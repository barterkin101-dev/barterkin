'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { LoaderCircle, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

type BillingActionType = 'checkout-premium' | 'checkout-founding' | 'portal' | null

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
      <Button
        type="button"
        size="lg"
        disabled={anyPending}
        onClick={() =>
          startBillingFlow('/api/stripe/checkout-session', 'checkout-premium', {
            priceId: 'premium',
          })
        }
      >
        {premiumPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        Upgrade to Premium — $9/mo
      </Button>

      {foundingAvailable && (
        <Button
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
          Claim Founding Member — $5/mo
        </Button>
      )}
    </div>
  )
}
