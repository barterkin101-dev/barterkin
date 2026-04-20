'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * AUTH-04 UX companion. Sends the user back to /login where they can
 * re-run Turnstile + submit a fresh magic link.
 *
 * UAT Gap 3 fix:
 *   - Accepts email as optional (string | null | undefined)
 *   - When email is missing/empty/the 'your inbox' placeholder, navigates to /login
 *     with NO ?email= param (LoginForm leaves the field blank — clean UX)
 *   - When email is present and real, navigates to /login?email=<encoded> so
 *     LoginForm's useEffect hydrates the field
 *   - Uses next/link under <Button asChild> for guaranteed Next.js client-side
 *     navigation (raw <a> can fail to navigate in some Button-Slot edge cases)
 */
export function ResendLinkButton({ email }: { email?: string | null }) {
  // Treat the page-level fallback string as "no real email" — never want it in a query param.
  const hasRealEmail =
    typeof email === 'string'
    && email.length > 0
    && email !== 'your inbox'

  const resendHref = hasRealEmail
    ? `/login?email=${encodeURIComponent(email!)}`
    : '/login'

  return (
    <Button asChild size="lg" className="w-full">
      <Link href={resendHref}>Resend verification link</Link>
    </Button>
  )
}
