'use client'
import { ErrorState } from '@/components/ui/ErrorState'

export default function AdminTicketsError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Couldn&apos;t load tickets" reset={reset} />
}
