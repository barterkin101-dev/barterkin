'use client'

import { useActionState, useEffect } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { featureListing } from '@/lib/actions/listings'
import type { FeatureListingResult } from '@/lib/actions/listings.types'

const FEATURE_COST = 5

export function FeatureListingButton({
  listingId,
  isFeatured,
  credits,
}: {
  listingId: string
  isFeatured: boolean
  credits: number
}) {
  const [state, formAction, pending] = useActionState<FeatureListingResult | null, FormData>(
    featureListing,
    null,
  )

  useEffect(() => {
    if (state?.ok) {
      window.location.reload()
    }
  }, [state])

  const canFeature = !isFeatured && credits >= FEATURE_COST

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="listingId" value={listingId} />
      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={!canFeature || pending}
        title={
          isFeatured
            ? 'Already featured'
            : credits < FEATURE_COST
              ? `You need ${FEATURE_COST} credits`
              : 'Spend 5 credits to feature this listing for 7 days'
        }
      >
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {isFeatured ? 'Featured' : 'Feature This Listing'}
      </Button>
      {state?.error && !state.ok ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
    </form>
  )
}
