'use client'
import { ErrorState } from '@/components/ui/ErrorState'

export default function ListingDetailError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Couldn&apos;t load listing" reset={reset} />
}
