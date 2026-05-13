'use client'

import { useEffect } from 'react'
import { clientLogger } from '@/lib/utils/client-logger'

export default function BillingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    clientLogger.error('billing-error', 'Billing page error', {
      context: { message: error.message, digest: error.digest },
    })
  }, [error])

  return (
    <div className="space-y-6 py-12 text-center">
      <h2 className="font-serif text-2xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground">We could not load your billing information.</p>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  )
}
