'use client'

import { GoogleButton } from './GoogleButton'

/**
 * AUTH-01 + AUTH-08: Google OAuth CTA. Receives the shared captchaToken
 * from the page-level Turnstile widget (single CAPTCHA per page — UAT Gap 1 fix).
 */
export function GoogleAuthBlock({ captchaToken }: { captchaToken: string | null }) {
  return (
    <div className="space-y-3">
      <GoogleButton captchaToken={captchaToken} />
    </div>
  )
}
