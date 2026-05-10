'use client'

import { ErrorState } from '@/components/ui/ErrorState'

export default function VerifyPendingError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Couldn&apos;t load verification page" reset={reset} />
}
