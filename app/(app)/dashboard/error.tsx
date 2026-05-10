'use client'
import { ErrorState } from '@/components/ui/ErrorState'

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Dashboard error" reset={reset} />
}
