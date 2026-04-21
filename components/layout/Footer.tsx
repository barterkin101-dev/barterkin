import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'

/**
 * Site-wide footer. Spans every route.
 * Renders legal links always; auth state (Sign in vs. Log out + email) varies by claim.
 *
 * Uses getClaims() — NEVER getSession (banned per CLAUDE.md).
 * T-2-08: uses claims.sub only for "is authed" check; never reads user_metadata for trust decisions.
 */
export async function Footer() {
  let isAuthed = false
  let email = ''
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const claims = data?.claims
    isAuthed = !!claims?.sub
    email = (claims?.email as string | undefined) ?? ''
  } catch {
    // No request context during static prerendering — render unauthenticated state
  }

  return (
    <footer className="bg-forest text-sage-bg py-8 px-6 mt-16">
      <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-3 items-center">
        <div className="text-sm">
          © 2026 Barterkin · A Georgia community skills directory
        </div>
        <nav className="text-sm flex gap-4 md:justify-center flex-wrap">
          <Link href="/legal/tos" className="hover:underline hover:decoration-[var(--color-clay)]">
            Terms
          </Link>
          <span aria-hidden>·</span>
          <Link href="/legal/privacy" className="hover:underline hover:decoration-[var(--color-clay)]">
            Privacy
          </Link>
          <span aria-hidden>·</span>
          <Link href="/legal/guidelines" className="hover:underline hover:decoration-[var(--color-clay)]">
            Community Guidelines
          </Link>
        </nav>
        <div className="text-sm md:text-right space-y-1">
          {isAuthed ? (
            <>
              <div className="text-xs text-muted-foreground">Signed in as {email}</div>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="underline">Sign in</Link>
          )}
        </div>
      </div>
    </footer>
  )
}
