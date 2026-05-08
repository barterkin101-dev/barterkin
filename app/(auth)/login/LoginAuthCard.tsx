'use client'

import { useState } from 'react'
import { GoogleAuthBlock } from '@/components/auth/GoogleAuthBlock'
import { LoginForm } from '@/components/auth/LoginForm'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw } from 'lucide-react'

export function LoginAuthCard({ mode: _mode }: { mode: 'login' | 'signup' }) {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [turnstileStatus, setTurnstileStatus] = useState<'pending' | 'ok' | 'error' | 'expired'>('pending')

  return (
    <div className="space-y-6">
      <GoogleAuthBlock captchaToken={captchaToken} />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-sm text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <LoginForm captchaToken={captchaToken} />

      <TurnstileWidget
        onVerify={(t) => { setCaptchaToken(t); setTurnstileStatus('ok') }}
        onExpire={() => { setCaptchaToken(null); setTurnstileStatus('expired') }}
        onError={() => { setCaptchaToken(null); setTurnstileStatus('error') }}
      />

      {turnstileStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>Security check failed. This can happen with ad blockers, VPNs, or strict privacy settings.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 text-sm underline underline-offset-2 font-medium"
            >
              <RefreshCw className="h-3 w-3" /> Refresh and try again
            </button>
          </AlertDescription>
        </Alert>
      )}

      {turnstileStatus === 'expired' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Verification expired — waiting for a new token. This takes a few seconds.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
