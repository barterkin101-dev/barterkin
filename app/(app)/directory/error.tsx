'use client'
import { DirectoryErrorState } from '@/components/directory/DirectoryErrorState'

export default function DirectoryError({
  error: _error,
  reset: _reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <DirectoryErrorState />
}
