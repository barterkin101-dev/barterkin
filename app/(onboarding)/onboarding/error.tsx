'use client'

import { ErrorState } from '@/components/ui/ErrorState'

export default function OnboardingError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Onboarding error" reset={reset} />
}
