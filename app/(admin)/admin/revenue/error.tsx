'use client'

import { ErrorState } from '@/components/ui/ErrorState'

export default function AdminRevenueError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorState
      title="Revenue dashboard error"
      message="Couldn't load subscription metrics right now. Try again."
      reset={reset}
    />
  )
}
