'use client'
import { ErrorState } from '@/components/ui/ErrorState'

export default function SavedListingsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Saved listings error" reset={reset} />
}
