'use client'
import { ErrorState } from '@/components/ui/ErrorState'

export default function DirectoryError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState />
}
