'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ErrorStateProps {
  title?: string
  message?: string
  reset?: () => void
  showHome?: boolean
  showBack?: boolean
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We encountered an error loading this page. Please try again.',
  reset,
  showHome = true,
  showBack = true,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <AlertTriangle className="h-12 w-12 text-clay" aria-hidden="true" />
      <h1 className="mt-4 font-serif text-2xl font-bold text-forest-deep">{title}</h1>
      <p className="mt-2 max-w-md text-forest-mid">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {reset && (
          <Button onClick={reset}>
            Try again
          </Button>
        )}
        {showBack && (
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
        )}
        {showHome && (
          <Link href="/">
            <Button variant="ghost">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
