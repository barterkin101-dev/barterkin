'use client'

import { useState } from 'react'
import { GoogleButton } from './GoogleButton'
import { TurnstileWidget } from './TurnstileWidget'

/**
 * AUTH-01 + AUTH-08: Pairs the Google OAuth CTA with its own Turnstile widget.
 * Page-level consumers (app/(auth)/login, app/(auth)/signup) embed this as a
 * single unit; the Turnstile state is local to this block so it does not
 * conflict with the magic-link form's own Turnstile widget.
 */
export function GoogleAuthBlock() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      <GoogleButton captchaToken={captchaToken} />
      <TurnstileWidget
        onVerify={(t) => setCaptchaToken(t)}
        onExpire={() => setCaptchaToken(null)}
        onError={() => setCaptchaToken(null)}
      />
    </div>
  )
}
