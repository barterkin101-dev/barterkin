'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type BillingActionType = 'checkout' | 'portal' | null

export function BillingActions({
  canManageBilling,
}: {
  canManageBilling: boolean
}) {
  const [pendingAction, setPendingAction] = useState<BillingActionType>(null)

  async function startBillingFlow(endpoint: string, action: Exclude<BillingActionType, null>) {
    try {
      setPendingAction(action)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
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

  const checkoutPending = pendingAction === 'checkout'
  const portalPending = pendingAction === 'portal'

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        type="button"
        size="lg"
        disabled={pendingAction !== null}
        onClick={() => startBillingFlow('/api/stripe/checkout-session', 'checkout')}
      >
        {checkoutPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {canManageBilling ? 'Change Plan' : 'Upgrade to Premium'}
      </Button>

      <Button
        type="button"
        size="lg"
        variant="outline"
        disabled={!canManageBilling || pendingAction !== null}
        onClick={() => startBillingFlow('/api/stripe/customer-portal', 'portal')}
      >
        {portalPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        Manage Billing
      </Button>
    </div>
  )
}
