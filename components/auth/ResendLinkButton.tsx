'use client'

import { Button } from '@/components/ui/button'

/**
 * AUTH-04 UX companion. For Phase 2 MVP, resend is implemented as a route
 * back to /login?email=<prefill>, where the user re-runs Turnstile + submits.
 * This avoids double-rendering Turnstile on /verify-pending and honors
 * D-AUTH-08 (CAPTCHA on every signup submission).
 *
 * If post-launch UX demands true inline resend, a follow-up plan adds a second
 * Turnstile widget here and calls sendMagicLink directly.
 */
export function ResendLinkButton({ email }: { email: string }) {
  const resendHref = `/login?email=${encodeURIComponent(email)}`

  return (
    <Button asChild size="lg" className="w-full">
      <a href={resendHref}>Resend verification link</a>
    </Button>
  )
}
