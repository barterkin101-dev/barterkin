'use client'
import { ErrorState } from '@/components/ui/ErrorState'

export default function DirectoryError({
  error: _error,
  reset: _reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState />
}
