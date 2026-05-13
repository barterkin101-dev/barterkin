'use client'

import { useEffect } from 'react'
import { clientLogger } from '@/lib/utils/client-logger'
import { ErrorState } from '@/components/ui/ErrorState'

export default function BillingSuccessError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    clientLogger.error('billing-success-error', 'billing success page error', {
      context: { message: error.message, digest: error.digest },
    })
  }, [error])

  return (
    <div className="mx-auto max-w-2xl py-12">
      <ErrorState
        title="Something went wrong"
        message="We couldn't load your billing confirmation. Your payment was still processed. Check your billing page for the latest status."
        reset={reset}
      />
    </div>
  )
}
