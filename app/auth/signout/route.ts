import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * AUTH-05: POST-only logout.
 * POST-only prevents prefetch/GET-triggered accidental logout (RESEARCH Pitfall 8, T-2-05).
 * Next.js returns 405 for GET automatically when only POST is exported.
 *
 * Status 303 after POST forces browsers to re-request via GET (per HTTP spec);
 * a 302 after POST is re-POSTed by some clients.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/`, { status: 303 })
}
