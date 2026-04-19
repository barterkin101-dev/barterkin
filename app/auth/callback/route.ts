import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * AUTH-01: Google OAuth callback.
 * Supabase redirects here with ?code=<...> after Google consent.
 * We exchange the code for a session (cookies set via @supabase/ssr adapter)
 * and redirect to ?next (open-redirect guarded) or /directory.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/directory'
  // T-2-01 open-redirect guard: only allow relative paths starting with '/'
  const next = nextParam.startsWith('/') ? nextParam : '/directory'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[auth/callback] exchangeCodeForSession failed', {
      code: error.code,
      status: error.status,
    })
  }

  return NextResponse.redirect(`${origin}/auth/error?reason=exchange_failed`)
}
