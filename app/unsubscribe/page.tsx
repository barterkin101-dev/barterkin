'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const profileId = searchParams.get('id')
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!profileId || !token) {
      setStatus('error')
      setErrorMessage('Missing unsubscribe link. Please check the link in your email.')
      return
    }

    async function unsubscribe() {
      setStatus('loading')
      try {
        const res = await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId, token }),
        })

        const data = await res.json()

        if (res.ok && data.ok) {
          setStatus('success')
        } else {
          setStatus('error')
          setErrorMessage(data.error || 'Something went wrong. Please try again.')
        }
      } catch {
        setStatus('error')
        setErrorMessage('Network error. Please try again.')
      }
    }

    unsubscribe()
  }, [profileId, token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-sage-pale p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {status === 'success' ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            ) : status === 'error' ? (
              <AlertCircle className="h-6 w-6 text-destructive" />
            ) : (
              <Mail className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl">
            {status === 'success'
              ? 'You\'re unsubscribed'
              : status === 'error'
                ? 'Couldn\'t unsubscribe'
                : 'Unsubscribing...'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Turning off your weekly digest emails...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You will no longer receive weekly digest emails from Barterkin.
              </p>
              <p className="text-xs text-muted-foreground">
                Changed your mind? You can re-enable digest emails anytime from your{' '}
                <a href="/profile/edit" className="text-primary underline">
                  profile settings
                </a>.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{errorMessage}</p>
              {profileId && token && (
                <Button
                  onClick={() => {
                    setStatus('idle')
                    // Re-trigger useEffect
                    window.location.reload()
                  }}
                  variant="outline"
                >
                  Try again
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-sage-pale p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <CardTitle className="text-xl">Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  )
}
