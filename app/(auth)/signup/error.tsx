'use client'

import { ErrorState } from '@/components/ui/ErrorState'

export default function SignupError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Sign-up error" reset={reset} />
}
