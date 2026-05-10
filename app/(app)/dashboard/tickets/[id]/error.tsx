'use client'
import { ErrorState } from '@/components/ui/ErrorState'

export default function TicketDetailError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Couldn&apos;t load ticket" reset={reset} />
}
