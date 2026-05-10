'use client'
import { ErrorState } from '@/components/ui/ErrorState'

export default function AdminListingsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Couldn&apos;t load listings" reset={reset} />
}
