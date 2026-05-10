'use client'

import { ErrorState } from '@/components/ui/ErrorState'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <ErrorState
          title="Something went wrong"
          message={error?.message || 'We encountered an unexpected error. Please try again.'}
          reset={reset}
          showHome={false}
          showBack={false}
        />
      </body>
    </html>
  )
}
