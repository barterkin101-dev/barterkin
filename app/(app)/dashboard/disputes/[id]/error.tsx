'use client'
import { ErrorState } from '@/components/ui/ErrorState'

export default function DisputeDetailError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Couldn&apos;t load dispute" reset={reset} />
}
