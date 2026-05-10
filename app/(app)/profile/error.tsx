'use client'

import { ErrorState } from '@/components/ui/ErrorState'

export default function ProfileError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Couldn&apos;t load profile" reset={reset} />
}
