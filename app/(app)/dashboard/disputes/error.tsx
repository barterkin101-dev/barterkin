'use client'
import { ErrorState } from '@/components/ui/ErrorState'

export default function DisputesError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Couldn&apos;t load disputes" reset={reset} />
}
