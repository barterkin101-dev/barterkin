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
  '/onboarding', // D-02/Pitfall 1: prevents infinite redirect loop when the user IS on /onboarding
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

  // AUTH-01: unauthenticated users are gated out of verified-only prefixes
  if (!isAuthed && isVerifiedOnlyPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // AUTH-04: unverified users are gated out of verified-only prefixes
  if (isAuthed && !isVerified && isVerifiedOnlyPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/verify-pending'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // ADMIN-06 (Phase 8) — admin email guard
  // Spec: /admin/* is reachable only by the designated ADMIN_EMAIL; all others redirect.
  // Uses claims.email (top-level, JWKS-verified) — NEVER the user_metadata.email field (user-writable).
  // ADMIN_EMAIL has no NEXT_PUBLIC_ prefix — server-only per defense-in-depth.
  const ADMIN_PREFIX = '/admin'
  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!isAuthed) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = ''
      return NextResponse.redirect(url)
    }
    const adminEmail = process.env.ADMIN_EMAIL
    const userEmail = claims?.email as string | undefined
    if (!adminEmail || userEmail !== adminEmail) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  // Phase 9 D-02 + D-10: onboarding redirect guard.
  // Intercepts authed + email-verified users whose profiles.onboarding_completed_at IS NULL
  // and redirects them to /onboarding.
  //
  // Scoped to VERIFIED_REQUIRED_PREFIXES only (matches the email-verify check at line 67-69)
  // so the DB round-trip does not run for unauthenticated or landing-page requests.
  // Pitfall 2 mitigation: unconditional query would cost 10-30ms on every authed request.
  //
  // Skips: /onboarding itself (loop prevention via ALWAYS_ALLOWED), /admin (admin flow separate),
  // and any path already in ALWAYS_ALLOWED.
  const isVerifiedPrefixed = VERIFIED_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAlreadyOnboarding = pathname.startsWith('/onboarding')
  const isAdminPath = pathname.startsWith('/admin')
  const isAlwaysAllowedPath = ALWAYS_ALLOWED.some((p) => pathname.startsWith(p))

  if (
    isAuthed &&
    isVerified &&
    isVerifiedPrefixed &&
    !isAlreadyOnboarding &&
    !isAdminPath &&
    !isAlwaysAllowedPath
  ) {
    // Use claims.sub (JWKS-verified) — NOT getUser() — consistent with admin guard pattern.
    // The anon client + user cookie satisfies the "Owners see own profile" RLS SELECT policy
    // (verified against 003_profile_tables.sql line 291-293).
    const { data: onboardingProfile } = await supabase
      .from('profiles')
      .select('onboarding_completed_at')
      .eq('owner_id', claims!.sub as string)
      .maybeSingle()

    // NULL onboarding_completed_at OR no profile row yet → redirect to /onboarding.
    // RESEARCH Open Question 2: new user with no profile row is still a wizard candidate.
    if (!onboardingProfile || onboardingProfile.onboarding_completed_at === null) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return response
}
