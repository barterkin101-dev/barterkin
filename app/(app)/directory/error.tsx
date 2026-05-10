'use client'
import { ErrorState } from '@/components/ui/ErrorState'

export default function DirectoryError({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  error: _error,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  reset: _reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState />
}
