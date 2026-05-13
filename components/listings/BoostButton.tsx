'use client'

import { useActionState, useEffect } from 'react'
import { Rocket, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { boostListing } from '@/lib/actions/listings'
import type { BoostListingResult } from '@/lib/actions/listings.types'

export function BoostButton({
  listingId,
  isBoosted,
  credits,
}: {
  listingId: string
  isBoosted: boolean
  credits: number
}) {
  const [state, formAction, pending] = useActionState<BoostListingResult | null, FormData>(
    boostListing,
    null,
  )

  useEffect(() => {
    if (state?.ok) {
      // Force refresh to show updated boosted state
      window.location.reload()
    }
  }, [state])

  const canBoost = !isBoosted && credits >= 1

  return (
    <form action={formAction}>
      <input type="hidden" name="listingId" value={listingId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={!canBoost || pending}
        title={
          isBoosted
            ? 'Already boosted'
            : credits < 1
              ? 'Earn credits by inviting friends'
              : 'Spend 1 credit to feature for 7 days'
        }
      >
        {pending ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Rocket className="mr-1 h-3 w-3" />
        )}
        {isBoosted ? 'Boosted' : 'Boost'}
      </Button>
      {state?.error && !state.ok && (
        <p className="mt-1 text-xs text-destructive">{state.error}</p>
      )}
    </form>
  )
}
