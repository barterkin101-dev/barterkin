'use client'

import { useState } from 'react'
import { GoogleAuthBlock } from '@/components/auth/GoogleAuthBlock'
import { LoginForm } from '@/components/auth/LoginForm'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'
import { Separator } from '@/components/ui/separator'

/**
 * UAT Gap 1 fix: single shared Turnstile widget gates both Google OAuth and
 * magic-link auth paths. captchaToken state lives here (page-level) and is
 * passed down to both GoogleAuthBlock and LoginForm so they share one CAPTCHA.
 *
 * mode prop is currently presentational — both /login and /signup render the
 * same composition; mode is reserved for future copy variants.
 */
export function LoginAuthCard({ mode: _mode }: { mode: 'login' | 'signup' }) {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

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
        onVerify={(t) => setCaptchaToken(t)}
        onExpire={() => setCaptchaToken(null)}
        onError={() => setCaptchaToken(null)}
      />
    </div>
  )
}
