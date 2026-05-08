'use client'
import { ErrorState } from '@/components/ui/ErrorState'

export default function DashboardError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Dashboard error" reset={reset} />
}
