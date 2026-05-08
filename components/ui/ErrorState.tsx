'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  reset?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We encountered an error loading this page. Please try again.',
  reset,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <AlertTriangle className="h-12 w-12 text-clay" aria-hidden="true" />
      <h1 className="mt-4 font-serif text-2xl font-bold text-forest-deep">{title}</h1>
      <p className="mt-2 max-w-md text-forest-mid">{message}</p>
      {reset && (
        <Button onClick={reset} className="mt-6">
          Try again
        </Button>
      )}
    </div>
  )
}
