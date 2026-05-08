'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    <Link href={resendHref} className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
      Resend verification link
    </Link>
  )
}
