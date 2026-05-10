'use client'

import { ErrorState } from '@/components/ui/ErrorState'

export default function MemberProfileError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState title="Couldn&apos;t load member profile" reset={reset} />
}
