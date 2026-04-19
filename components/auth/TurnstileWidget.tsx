'use client'

import { Turnstile } from '@marsidev/react-turnstile'

interface TurnstileWidgetProps {
  /** Called when Cloudflare returns a valid token. Pass this up to the form. */
  onVerify: (token: string) => void
  /** Called when the token expires (Cloudflare default: ~5 min). Form should clear its captcha state. */
  onExpire?: () => void
  /** Called when the widget fails to render or the challenge errors. */
  onError?: () => void
}

/**
 * AUTH-08: Cloudflare Turnstile widget.
 * Wraps @marsidev/react-turnstile. Renders the iframe (fixed 300x65 per Cloudflare)
 * centered with breathing room per UI-SPEC.
 *
 * The sitekey is PUBLIC (safe to expose via NEXT_PUBLIC_). The secret lives in
 * Supabase Studio — Supabase Auth calls /siteverify server-side when the token
 * is passed via signInWithOtp options.captchaToken.
 */
export function TurnstileWidget({ onVerify, onExpire, onError }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!siteKey) {
    // Dev-only fallback — the Zod schema in sendMagicLink will still reject
    // a missing captchaToken, so this cannot bypass the gate.
    return (
      <div className="text-sm text-destructive text-center my-4">
        Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY — check .env.local.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center my-4 gap-2">
      <Turnstile
        siteKey={siteKey}
        onSuccess={onVerify}
        onExpire={onExpire}
        onError={onError}
        options={{
          theme: 'light',
          action: 'signup',
        }}
      />
      <p className="text-xs text-muted-foreground">
        Protected by Cloudflare Turnstile.{' '}
        <a
          href="https://www.cloudflare.com/privacypolicy/"
          target="_blank"
          rel="noopener"
          className="underline"
        >
          Privacy
        </a>
        {' · '}
        <a
          href="https://www.cloudflare.com/website-terms/"
          target="_blank"
          rel="noopener"
          className="underline"
        >
          Terms
        </a>
      </p>
    </div>
  )
}
