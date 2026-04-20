import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

// AUTH-09: authed users bounced away from these paths
const AUTH_GROUP_PATHS = ['/login', '/signup']

// AUTH-04: unverified users bounced to /verify-pending from these prefixes.
// Phase 2 installs this list in advance of /directory, /m/, /profile existing
// (Phase 3/4). Check is a no-op until those paths exist.
const VERIFIED_REQUIRED_PREFIXES = ['/directory', '/m/', '/profile']

// Paths always accessible (even to unverified users) so they don't redirect-loop
const ALWAYS_ALLOWED = [
  '/verify-pending',
  '/auth/callback',
  '/auth/confirm',
  '/auth/signout',
  '/auth/error',
  '/legal/',
]

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Primary auth check — JWKS-verified, no round-trip (CLAUDE.md: getClaims preferred).
  // NEVER use getSession() on server paths (banned).
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const isAuthed = !!claims?.sub
  // Trust the top-level email_verified claim (comes from auth.users.email_confirmed_at).
  // NEVER trust user_metadata.email_verified (writable by user — T-2-08).
  let isVerified = !!claims?.email_verified

  const pathname = request.nextUrl.pathname

  // AUTH-09: authed users should not see /login or /signup
  if (isAuthed && AUTH_GROUP_PATHS.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/directory'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // AUTH-04 + AUTH-01 (UAT Gap 2 fix): if claims-based fast path says "unverified"
  // BUT this is an OAuth user (Google), the email_verified claim may be missing
  // even though the provider verifies email. Fall through to one getUser() round-trip
  // ONLY when (a) authed, (b) fast path says unverified, (c) request actually matches
  // a verified-only path. Cost: ~50ms once per affected request, never on the hot path.
  const isVerifiedOnlyPath =
    VERIFIED_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p))
    && !ALWAYS_ALLOWED.some((p) => pathname.startsWith(p))

  if (isAuthed && !isVerified && isVerifiedOnlyPath) {
    // RESEARCH PITFALL 4: Google JWTs may omit email_verified at the access-token
    // claim surface. getUser() pulls the authoritative auth.users row.
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (user) {
      const provider = user.app_metadata?.provider as string | undefined
      // Trust email_confirmed_at (Supabase-managed) and provider==='google'
      // (Google always verifies email — Apple does too, but Apple is deferred).
      // DO NOT trust user_metadata.email_verified (user-writable).
      if (user.email_confirmed_at || provider === 'google') {
        isVerified = true
      }
    }
  }

  // AUTH-04: unverified users are gated out of verified-only prefixes
  if (isAuthed && !isVerified && isVerifiedOnlyPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/verify-pending'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
