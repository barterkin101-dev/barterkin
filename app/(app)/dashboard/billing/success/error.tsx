'use client'

import { useEffect } from 'react'
import { createLogger } from '@/lib/utils/client-logger'
import { ErrorState } from '@/components/ui/ErrorState'

const log = createLogger('billing-success-error')

export default function BillingSuccessError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    log.error('billing success page error', { context: { message: error.message, digest: error.digest } })
  }, [error])

  return (
    <div className="mx-auto max-w-2xl py-12">
      <ErrorState
        title="Something went wrong"
        description="We couldn't load your billing confirmation. Your payment was still processed — check your billing page for the latest status."
        onRetry={reset}
      />
    </div>
  )
}
