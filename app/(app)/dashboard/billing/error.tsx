'use client'

import { ErrorState } from '@/components/ui/ErrorState'

export default function BillingError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorState
      title="Couldn&apos;t load billing"
      message="We could not load your billing information. Please try again."
      reset={reset}
    />
  )
}
