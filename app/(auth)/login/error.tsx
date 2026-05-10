'use client'

import { ErrorState } from '@/components/ui/ErrorState'

export default function LoginError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Sign-in error" reset={reset} />
}
